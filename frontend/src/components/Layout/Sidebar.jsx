// src/components/Layout/Sidebar.jsx
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Home,
  Users,
  CreditCard,
  Calendar,
  BookOpen,
  Receipt,
  FileText,
  X,
  Building2,
  PiggyBank,
  User,
  Settings,
  BarChart3,
  HelpCircle,
  Briefcase,
  ClipboardList, // Added
} from "lucide-react";

// Helper function to format role for display
const formatRole = (role) => {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, hostelType, role } = useAuth();
  const location = useLocation();

  // Determine navigation items based on user role

  // Navigation items for admin/manager
  const adminNavItems = [
    // Main Navigation
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Students", href: "/students", icon: Users },
    { name: "Student Attendance", href: "/attendance", icon: Calendar },
    { name: "Fees", href: "/fees", icon: CreditCard },
    // { name: "Fee Configuration", href: "/fee-configuration", icon: Settings },
    { name: "Mess Management", href: "/mess", icon: Calendar },
    { name: "Marks", href: "/marks", icon: BookOpen },
    { name: "Expenses", href: "/expenses", icon: Receipt },
    { name: "StudentBank", href: "/student-bank", icon: PiggyBank },
    { name: "Employees", href: "/employees", icon: Briefcase },
    { name: "Staff Attendance", href: "/employees/attendance", icon: ClipboardList },
    { name: "Reports", href: "/reports", icon: FileText },
    { type: "divider" },
    // Advanced Features
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { type: "divider" },
    // System
    { name: "Help & Support", href: "/help", icon: HelpCircle },
    { name: "Profile", href: "/profile", icon: User },
  ];

  // Navigation items for Manager
  const managerNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Students", href: "/students", icon: Users },
    { name: "Student Attendance", href: "/attendance", icon: Calendar },
    { name: "Marks", href: "/marks", icon: BookOpen },
    { name: "StudentBank", href: "/student-bank", icon: PiggyBank },
    { name: "Employees", href: "/employees", icon: Briefcase },
    { name: "Staff Attendance", href: "/employees/attendance", icon: ClipboardList },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Profile", href: "/profile", icon: User },
  ];
  // watchman nav items
  const watchmanNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "GateEntry", href: "/watchman/gate-entry", icon: Building2 },
    { name: "Profile", href: "/watchman/profile", icon: User },
  ];

  // Role based navigation selection
  const navItems =
    role === "admin"
      ? adminNavItems
      : role === "manager"
        ? managerNavItems
        : watchmanNavItems;

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.href;

    return (
      <NavLink
        to={item.href}
        onClick={onClose}
        className={`group flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
          isActive
            ? "bg-indigo-100 text-indigo-700 shadow-sm font-semibold border-l-4 border-indigo-600"
            : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
        }`}
      >
        <item.icon
          className={`h-5 w-5 ${
            isActive
              ? "text-indigo-600"
              : "text-gray-500 group-hover:text-indigo-600"
          }`}
        />
        {item.name}
        {isActive && (
          <span className="ml-auto w-2 h-2 bg-indigo-600 rounded-full"></span>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex-shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Sidebar Content Container */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-sm">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-bold text-gray-800">{formatRole(user?.role)} Panel</h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation - Scrollable Area */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-6 scrollbar-thin scrollbar-thumb-gray-300/50 scrollbar-track-transparent hover:scrollbar-thumb-gray-400/60">
            <div className="space-y-1">
              {navItems.map((item, index) =>
                item.type === "divider" ? (
                  <div
                    key={`divider-${index}`}
                    className="my-4 border-t border-gray-200"
                  ></div>
                ) : (
                  <NavItem key={item.name} item={item} />
                )
              )}
            </div>
          </nav>

          {/* User Info - Fixed at Bottom */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-slate-50">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
