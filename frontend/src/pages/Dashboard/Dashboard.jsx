import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, useInView, useAnimation } from "framer-motion";
import toast from "react-hot-toast";
import { dashboardAPI } from "../../services/api";
import {
  Users,
  CreditCard,
  Receipt,
  AlertCircle,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  BarChart2,
  PieChart,
  TrendingUp as TrendingUpIcon,
  Activity,
} from "lucide-react";
import LoadingSpinner from "../../components/UI/LoadingSpinner";
import QuickActions from "../../components/Dashboard/QuickActions";

// Animated Number Component with Counting Effect
const AnimatedNumber = ({ value, duration = 2000, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef();
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView) return;
    
    const start = 0;
    const end = typeof value === 'number' ? value : parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
    
    if (start === end) {
      setCount(end);
      return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      
      setCount(current);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value, duration, isInView]);

  const displayValue = typeof value === 'string' && value.includes('₹')
    ? `₹${count.toLocaleString()}`
    : count;

  return (
    <span ref={ref}>
      {prefix}{displayValue}{suffix}
    </span>
  );
};

// FadeIn Animation Component
const FadeIn = ({ children, delay = 0, className = '' }) => {
  const ref = useRef();
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            delay: delay * 0.1,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Progress Bar Component
const ProgressBar = ({ value, color = 'bg-indigo-600', className = '' }) => {
  const [width, setWidth] = useState(0);
  const ref = useRef();
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      setWidth(value);
    }
  }, [isInView, value]);

  return (
    <div ref={ref} className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div
        className={`${color} h-2.5 rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${isInView ? width : 0}%` }}
      />
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await dashboardAPI.getStats();
      console.log("📊 Dashboard Data:", res.data);
      return res;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Helper function to handle navigation with feedback
  const handleNavigation = (path, message, state = null) => {
    toast.success(message);
    navigate(path, state ? { state } : undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading dashboard
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {error.response?.data?.message || "Failed to load dashboard data"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.data?.stats || {};
  const recentActivities = dashboardData?.data?.recentActivities || {};
  const upcomingBirthdays = dashboardData?.data?.upcomingBirthdays || [];

  // Enhanced StatCard with animations
  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    change,
    onClick,
    href,
    description,
    index,
  }) => {
    return (
      <FadeIn delay={index}>
        <div
          className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${onClick || href ? 'cursor-pointer' : ''}`}
          onClick={onClick || (href ? () => navigate(href) : undefined)}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
              <p className="text-2xl font-bold text-gray-800 mb-1">
                <AnimatedNumber value={value} duration={1500} />
              </p>
              {description && (
                <p className="text-xs text-gray-500">{description}</p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
              <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
            </div>
          </div>
        </div>
      </FadeIn>
    );
  };

  return (
    <div className="space-y-6 xs:space-y-8 pb-6 xs:pb-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 xs:gap-6">
        <StatCard
          title="Total Students"
          value={stats.totalStudents || 0}
          icon={Users}
          color="bg-blue-500"
          onClick={() =>
            handleNavigation("/students", "Navigating to Student Management")
          }
          description="Active students"
          change={5.2}
          index={1}
        />
        <StatCard
          title="Fees This Month"
          value={`₹${(stats.totalFeesThisMonth || 0).toLocaleString()}`}
          icon={CreditCard}
          color="bg-green-500"
          onClick={() => handleNavigation("/fees", "Opening Fee Management")}
          description="Collected amount"
          change={12.5}
          index={2}
        />
        <StatCard
          title="Pending Installments"
          value={stats.pendingFeesCount || 0}
          icon={AlertCircle}
          color="bg-amber-500"
          onClick={() =>
            handleNavigation("/fees", "Showing Pending Fees", {
              filter: "pending",
            })
          }
          description="Outstanding payments"
          change={-3.2}
          index={3}
        />
        <StatCard
          title="Monthly Expenses"
          value={`₹${(stats.monthlyExpenses || 0).toLocaleString()}`}
          icon={Receipt}
          color="bg-rose-500"
          onClick={() =>
            handleNavigation("/expenses", "Opening Expense Tracker")
          }
          description="This month's spending"
          change={8.7}
          index={4}
        />
      </div>

      {/* Quick Actions */}
      <FadeIn delay={5}>
        <QuickActions />
      </FadeIn>

      {/* Attendance & Entry Status Section */}
      <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-4 xs:gap-6">
        {/* Today's Attendance */}
        <FadeIn delay={6}>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl h-full flex flex-col">
            <div className="p-4 xs:p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4 xs:mb-6">
                <h3 className="text-base xs:text-lg font-semibold text-gray-800">
                  Today's Attendance
                </h3>
                <button
                  onClick={() => navigate("/attendance")}
                  className="text-xs xs:text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center transition-colors touch-target"
                >
                  View Details
                  <ArrowRight className="h-3 xs:h-4 w-3 xs:w-4 ml-1" />
                </button>
              </div>
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 xs:gap-3 mb-4 xs:mb-6 flex-1">
                <div
                  className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-50/80 hover:from-green-100 hover:to-green-50 cursor-pointer transition-all duration-300 border border-green-100 flex flex-col items-center justify-center h-full"
                  onClick={() => navigate("/attendance")}
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-lg xs:text-xl font-bold text-gray-800">
                    <AnimatedNumber value={stats.attendanceToday?.present || 0} duration={1000} />
                  </div>
                  <div className="text-xs xs:text-sm text-gray-600 mt-1">Present</div>
                </div>
                <div
                  className="text-center p-3 xs:p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-50/80 hover:from-red-100 hover:to-red-50 cursor-pointer transition-all duration-300 border border-red-100 flex flex-col items-center justify-center h-full touch-target"
                  onClick={() => navigate("/attendance")}
                >
                  <div className="w-8 xs:w-10 h-8 xs:h-10 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <XCircle className="h-4 xs:h-5 w-4 xs:w-5 text-red-600" />
                  </div>
                  <div className="text-lg xs:text-xl font-bold text-gray-800">
                    <AnimatedNumber value={stats.attendanceToday?.absent || 0} duration={1000} />
                  </div>
                  <div className="text-xs xs:text-sm text-gray-600 mt-1">Absent</div>
                </div>
                <div
                  className="text-center p-3 xs:p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-50/80 hover:from-amber-100 hover:to-amber-50 cursor-pointer transition-all duration-300 border border-amber-100 flex flex-col items-center justify-center h-full touch-target"
                  onClick={() => navigate("/attendance")}
                >
                  <div className="w-8 xs:w-10 h-8 xs:h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-4 xs:h-5 w-4 xs:w-5 text-amber-600" />
                  </div>
                  <div className="text-lg xs:text-xl font-bold text-gray-800">
                    <AnimatedNumber value={stats.attendanceToday?.late || 0} duration={1000} />
                  </div>
                  <div className="text-xs xs:text-sm text-gray-600 mt-1">Late</div>
                </div>
              </div>
              <div className="mt-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Attendance Rate
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    <AnimatedNumber value={`${stats.attendanceToday?.rate || 0}`} duration={1500} suffix="%" />
                  </span>
                </div>
                <ProgressBar 
                  value={stats.attendanceToday?.rate || 0} 
                  color="bg-gradient-to-r from-green-500 to-emerald-500"
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {stats.attendanceToday?.present || 0} of {stats.attendanceToday?.total || 0} students marked present
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Gate Entry Status */}
        <FadeIn delay={7}>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden h-full transition-all duration-300 hover:shadow-xl">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Hostel Entry Status
                </h3>
                <button
                  onClick={() => navigate("/attendance")}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center transition-colors"
                >
                  View Details
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
                <div
                  className="text-center p-5 rounded-xl bg-gradient-to-br from-green-50 to-green-50/80 hover:from-green-100 hover:to-green-50 cursor-pointer transition-all duration-300 border border-green-100 flex flex-col items-center justify-center h-full"
                  onClick={() => navigate("/attendance")}
                >
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <LogIn className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    <AnimatedNumber value={stats.gateEntry?.in || 0} duration={1000} />
                  </div>
                  <div className="text-sm text-gray-600">In Hostel</div>
                </div>
                <div
                  className="text-center p-5 rounded-xl bg-gradient-to-br from-orange-50 to-orange-50/80 hover:from-orange-100 hover:to-orange-50 cursor-pointer transition-all duration-300 border border-orange-100 flex flex-col items-center justify-center h-full"
                  onClick={() => navigate("/attendance")}
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <LogOut className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    <AnimatedNumber value={stats.gateEntry?.out || 0} duration={1000} />
                  </div>
                  <div className="text-sm text-gray-600">Out of Hostel</div>
                </div>
              </div>
              <div className="mt-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Occupancy Rate
                  </span>
                  <span className="text-lg font-bold text-indigo-600">
                    <AnimatedNumber value={`${stats.gateEntry?.occupancyRate || 0}`} duration={1500} suffix="%" />
                  </span>
                </div>
                <ProgressBar 
                  value={stats.gateEntry?.occupancyRate || 0} 
                  color="bg-gradient-to-r from-indigo-500 to-purple-500"
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {stats.gateEntry?.in || 0} of {stats.totalStudents || 0} students in hostel
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Recent Activities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Fee Payments */}
        <FadeIn delay={8}>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden h-full transition-all duration-300 hover:shadow-xl">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Recent Fee Payments
                </h3>
                <button
                  onClick={() => navigate("/fees")}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center transition-colors"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>
              <div className="space-y-3 flex-1">
                {recentActivities.fees?.length > 0 ? (
                  recentActivities.fees.slice(0, 5).map((fee) => (
                    <div
                      key={fee._id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer rounded px-2 transition-colors"
                      onClick={() => navigate(`/students/${fee.student?._id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {fee.student?.name || 'Unknown Student'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {fee.student?.studentId} • {fee.student?.class}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          ₹{(fee.paidAmount || fee.amount || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(fee.paymentDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-2">No recent payments</p>
                    <button
                      onClick={() => navigate("/fees")}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Record a Payment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Upcoming Birthdays */}
        <FadeIn delay={9}>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden h-full transition-all duration-300 hover:shadow-xl">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Upcoming Birthdays
                </h3>
                <button
                  onClick={() =>
                    navigate("/students", { state: { filter: "birthdays" } })
                  }
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center transition-colors"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>
              <div className="space-y-3 flex-1">
                {upcomingBirthdays.length > 0 ? (
                  upcomingBirthdays.slice(0, 5).map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer rounded px-2 transition-colors"
                      onClick={() => navigate(`/students/${student._id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {student.studentId} • {student.class}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-purple-600">
                          {new Date(student.dateOfBirth).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                        <p className="text-xs text-gray-500">🎂 Birthday</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-2">
                      No upcoming birthdays
                    </p>
                    <button
                      onClick={() => navigate("/students")}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      View Students
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Recent Expenses - Full Width */}
      <FadeIn delay={10}>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden h-full transition-all duration-300 hover:shadow-xl">
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Recent Expenses</h3>
              <button
                onClick={() => navigate("/expenses")}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center transition-colors"
              >
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-96 pr-2">
              {recentActivities.expenses?.length > 0 ? (
                recentActivities.expenses.slice(0, 5).map((expense) => (
                  <div
                    key={expense._id}
                    className="flex items-center justify-between py-3 px-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer rounded-lg transition-all duration-200 hover:shadow-sm"
                    onClick={() =>
                      navigate("/expenses", {
                        state: { selectedExpense: expense._id },
                      })
                    }
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {expense.description}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {expense.category?.replace(/_/g, " ")} •{" "}
                        {expense.paymentMode}
                        {expense.vendor?.name && ` • ${expense.vendor.name}`}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium text-red-600">
                        ₹{expense.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 h-full">
                  <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-base text-gray-500 mb-4">No recent expenses recorded</p>
                  <button
                    onClick={() => navigate("/expenses")}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Expense
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

export default Dashboard;