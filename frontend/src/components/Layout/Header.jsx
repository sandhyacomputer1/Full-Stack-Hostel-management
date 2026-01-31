import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Menu, Clock, User, LogOut, Settings, Building2 } from "lucide-react";

const Header = ({ onMenuClick }) => {
  const { user, logout, hostelDetails } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    // Add when the dropdown is open, remove when it's closed
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const weekday = now.toLocaleDateString("en-IN", { weekday: "short" });
  const date = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
  };

  return (
    <header className="bg-indigo-700 shadow-lg">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Left side */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-3 rounded-lg text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 lg:hidden transition-all duration-200 touch-target"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="ml-4 lg:ml-0 flex items-center gap-3">
            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm shadow-sm">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-white leading-tight">
                {hostelDetails ? hostelDetails.name : "Hostel Management"}
              </h1>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* Date & Time */}
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/10 text-white/90 shadow-sm">
            <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-xs font-semibold text-white">{weekday}, {date}</div>
              <div className="text-[11px] text-white/80 font-medium">{time}</div>
            </div>
            <div className="sm:hidden text-xs font-semibold text-white">{time}</div>
          </div>

          {/* User Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 p-2 pr-3 text-sm rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-200 touch-target"
            >
              <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <div className="font-medium text-sm text-white">{user?.name}</div>
                <div className="text-xs text-white/70 capitalize">
                  {user?.role}
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-1.5 z-50 border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-indigo-50">
                  <div className="font-medium text-gray-900">{user?.name}</div>
                  <div className="text-sm text-gray-500">{user?.email}</div>
                </div>

                <button
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-200"
                >
                  <Settings className="h-4 w-4 mr-2.5 text-gray-500" />
                  Settings
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4 mr-2.5 text-red-500" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
