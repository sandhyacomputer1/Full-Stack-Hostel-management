import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserPlus,
  CreditCard,
  Calendar,
  BookOpen,
  FileText,
  Bell,
  Users,
  Receipt,
  PiggyBank,
  ArrowRight,
} from "lucide-react";

const QuickActions = () => {
  const containerRef = useRef(null);
  const actions = [
    {
      title: "Add Student",
      description: "Register a new student",
      icon: UserPlus,
      href: "/students/add",
      color: "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600",
      roles: ["admin", "manager"],
    },
    {
      title: "Record Payment",
      description: "Process fee payment",
      icon: CreditCard,
      href: "/fees",
      color: "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600",
      roles: ["admin", "manager"],
    },
    {
      title: "Mark Attendance",
      description: "Take daily attendance",
      icon: Calendar,
      href: "/attendance",
      color: "bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600",
      roles: ["admin", "manager"],
    },
    {
      title: "Student Bank",
      description: "Manage student bank accounts",
      icon: PiggyBank,
      href: "/student-bank",
      color: "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600",
      roles: ["admin", "manager"],
    },
    {
      title: "Add Marks",
      description: "Record exam results",
      icon: BookOpen,
      href: "/marks",
      color: "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600",
      roles: ["admin", "manager"],
    },
    {
      title: "View Students",
      description: "Manage student records",
      icon: Users,
      href: "/students",
      color: "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600",
      roles: ["admin", "manager"],
    },
    {
      title: "Add Expense",
      description: "Record hostel expense",
      icon: Receipt,
      href: "/expenses",
      color: "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600",
      roles: ["admin", "manager"],
    },
    {
      title: "Generate Report",
      description: "Create detailed reports",
      icon: FileText,
      href: "/reports",
      color: "bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700",
      roles: ["admin", "manager"],
    },
  ];

  // Animation variants for the container
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  // Animation variants for each item
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="p-4 xs:p-6">
        <div className="flex justify-between items-center mb-4 xs:mb-6">
          <h3 className="text-lg xs:text-xl font-semibold text-gray-800">Quick Actions</h3>
        </div>
        
        <motion.div 
          ref={containerRef}
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 xs:gap-4"
        >
          {actions.map((action, index) => (
            <motion.div key={action.title} variants={item}>
              <Link
                to={action.href}
                className={`${action.color} text-white rounded-xl p-3 xs:p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg block h-full touch-target`}
              >
                <div className="flex flex-col items-center text-center h-full">
                  <div className="p-2 xs:p-3 bg-white/20 rounded-full mb-2 xs:mb-3">
                    <action.icon className="h-5 xs:h-6 w-5 xs:w-6" />
                  </div>
                  <h4 className="text-xs xs:text-sm font-semibold mb-1">{action.title}</h4>
                  <p className="text-[10px] xs:text-xs opacity-90">{action.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default QuickActions;
