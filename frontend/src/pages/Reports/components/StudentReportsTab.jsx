// src/pages/Reports/components/StudentReportsTab.jsx
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { reportsAPI } from "../../../services/api";
import {
    User,
    Calendar,
    DollarSign,
    Coffee,
    BookOpen,
    CreditCard,
    LogIn,
    Download,
} from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import StudentSelector from "../../../components/Reports/StudentSelector";

const style = document.createElement("style");
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(26px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-slide-in {
        animation: slideInUp 0.65s ease-out;
    }
`;
document.head.appendChild(style);

const StudentReportsTab = () => {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionRefs = useRef({});

    useEffect(() => {
        if (!reportData) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleSections((prev) => new Set([...prev, entry.target.dataset.section]));
                }
            },
            { threshold: 0.12 }
        );

        Object.keys(sectionRefs.current).forEach((sectionId) => {
            const el = sectionRefs.current[sectionId];
            if (el) observer.observe(el);
        });

        return () => {
            Object.keys(sectionRefs.current).forEach((sectionId) => {
                const el = sectionRefs.current[sectionId];
                if (el) observer.unobserve(el);
            });
            observer.disconnect();
        };
    }, [reportData]);

    const handleStudentSelect = async (student) => {
        setSelectedStudent(student);
        setReportData(null);
        setVisibleSections(new Set());

        if (student) {
            await fetchStudentReport(student._id);
        }
    };

    const fetchStudentReport = async (studentId) => {
        try {
            setLoading(true);
            const response = await reportsAPI.getStudentReport(studentId);
            console.log("Student Report Response:", response);

            // ✅ FIX: Handle response structure correctly
            if (response.data && response.data.success) {
                setReportData(response.data.data);
            } else {
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.error("Failed to fetch student report:", error);
            toast.error("Failed to load student report");
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!reportData) {
            toast.error("No data to export");
            return;
        }

        // Create a simple text report
        const reportText = `
STUDENT REPORT
==============

Student Information:
- Name: ${reportData.student?.name || "N/A"}
- Student ID: ${reportData.student?.studentId || "N/A"}
- Roll Number: ${reportData.student?.rollNumber || "N/A"}
- Class: ${reportData.student?.class || "N/A"}
- Block: ${reportData.student?.block || "N/A"}

Attendance:
- Present Days: ${reportData.attendance?.presentDays || 0}
- Absent Days: ${reportData.attendance?.absentDays || 0}
- Leave Days: ${reportData.attendance?.leaveDays || 0}
- Total Days: ${reportData.attendance?.totalDays || 0}
- Attendance Rate: ${reportData.attendance?.rate || 0}%

Fees:
- Total Fee: ₹${reportData.fees?.totalFee || 0}
- Amount Paid: ₹${reportData.fees?.paid || 0}
- Amount Pending: ₹${reportData.fees?.pending || 0}
- Overdue Amount: ₹${reportData.fees?.overdue || 0}

Mess Consumption (Current Month):
- Breakfast: ${reportData.mess?.breakfast || 0}
- Lunch: ${reportData.mess?.lunch || 0}
- Dinner: ${reportData.mess?.dinner || 0}
- Total Meals: ${reportData.mess?.total || 0}

${reportData.bank ? `Bank Account:
- Balance: ₹${reportData.bank.balance || 0}
- Total Deposits: ₹${reportData.bank.totalDeposits || 0}
- Total Withdrawals: ₹${reportData.bank.totalWithdrawals || 0}` : ""}

${reportData.marks ? `Academic Performance:
- Average: ${reportData.marks.average || 0}%
- Grade: ${reportData.marks.grade || "N/A"}` : ""}
    `.trim();

        // Download as text file
        const blob = new Blob([reportText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `student_report_${reportData.student?.studentId || "unknown"}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Report exported successfully!");
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <div className="bg-indigo-600 rounded-full p-3 mr-3 shadow-lg">
                            <User className="h-6 w-6 text-white" />
                        </div>
                        Individual Student Report
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Search and view complete report for any student
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={!reportData}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="h-4 w-4" />
                    Export
                </button>
            </div>

            {/* Student Selector */}
            <div
                ref={(el) => (sectionRefs.current["student-selector"] = el)}
                data-section="student-selector"
                className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("student-selector") ? "animate-slide-in" : ""}`}
            >
                <StudentSelector
                    selectedStudent={selectedStudent}
                    onSelect={handleStudentSelect}
                />
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner size="lg" />
                </div>
            )}

            {/* Report Content */}
            {!loading && reportData && reportData.student && (
                <div className="space-y-6">
                    {/* Student Info Card */}
                    <div
                        ref={(el) => (sectionRefs.current["student-info"] = el)}
                        data-section="student-info"
                        className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("student-info") ? "animate-slide-in" : ""}`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {reportData.student.name}
                                </h3>
                                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Student ID:</span>
                                        <span className="ml-2 font-bold text-gray-900">
                                            {reportData.student.studentId}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Roll Number:</span>
                                        <span className="ml-2 font-bold text-gray-900">
                                            {reportData.student.rollNumber}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Class:</span>
                                        <span className="ml-2 font-bold text-gray-900">
                                            {reportData.student.class}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Block:</span>
                                        <span className="ml-2 font-bold text-gray-900">
                                            {reportData.student.block}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                            >
                                <Download className="h-4 w-4" />
                                Export Report
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Attendance */}
                        <div
                            ref={(el) => (sectionRefs.current["attendance-stats"] = el)}
                            data-section="attendance-stats"
                            className={`bg-white rounded-xl border border-gray-200 shadow-lg p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("attendance-stats") ? "animate-slide-in" : ""}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Attendance Rate</p>
                                    <p className="text-2xl font-bold text-purple-600">
                                        {reportData.attendance?.rate || 0}%
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {reportData.attendance?.presentDays || 0} / {reportData.attendance?.totalDays || 0} days
                                    </p>
                                </div>
                                <Calendar className="h-8 w-8 text-purple-600" />
                            </div>
                        </div>

                        {/* Fees */}
                        <div
                            ref={(el) => (sectionRefs.current["fees-stats"] = el)}
                            data-section="fees-stats"
                            className={`bg-white rounded-xl border border-gray-200 shadow-lg p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("fees-stats") ? "animate-slide-in" : ""}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Fee Pending</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        ₹{(reportData.fees?.pending || 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Paid: ₹{(reportData.fees?.paid || 0).toLocaleString()}
                                    </p>
                                </div>
                                <DollarSign className="h-8 w-8 text-red-600" />
                            </div>
                        </div>

                        {/* Mess */}
                        <div
                            ref={(el) => (sectionRefs.current["mess-stats"] = el)}
                            data-section="mess-stats"
                            className={`bg-white rounded-xl border border-gray-200 shadow-lg p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("mess-stats") ? "animate-slide-in" : ""}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Meals This Month</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {reportData.mess?.total || 0}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        B: {reportData.mess?.breakfast || 0} | L: {reportData.mess?.lunch || 0} | D: {reportData.mess?.dinner || 0}
                                    </p>
                                </div>
                                <Coffee className="h-8 w-8 text-orange-600" />
                            </div>
                        </div>

                        {/* Bank Balance */}
                        {reportData.bank && (
                            <div
                                ref={(el) => (sectionRefs.current["bank-stats"] = el)}
                                data-section="bank-stats"
                                className={`bg-white rounded-xl border border-gray-200 shadow-lg p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("bank-stats") ? "animate-slide-in" : ""}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600">Bank Balance</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            ₹{(reportData.bank.balance || 0).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Transactions: {reportData.bank.totalTransactions || 0}
                                        </p>
                                    </div>
                                    <CreditCard className="h-8 w-8 text-green-600" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Detailed Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Attendance Details */}
                        <div
                            ref={(el) => (sectionRefs.current["attendance-details"] = el)}
                            data-section="attendance-details"
                            className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("attendance-details") ? "animate-slide-in" : ""}`}
                        >
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                                Attendance Details
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Present Days</span>
                                    <span className="text-sm font-semibold text-green-600">
                                        {reportData.attendance?.presentDays || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Absent Days</span>
                                    <span className="text-sm font-semibold text-red-600">
                                        {reportData.attendance?.absentDays || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Leave Days</span>
                                    <span className="text-sm font-semibold text-yellow-600">
                                        {reportData.attendance?.leaveDays || 0}
                                    </span>
                                </div>
                                <div className="pt-2 border-t">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-700">Total Days</span>
                                        <span className="text-sm font-bold text-gray-900">
                                            {reportData.attendance?.totalDays || 0}
                                        </span>
                                    </div>
                                </div>

                                {/* Recent Attendance */}
                                {reportData.attendance?.recent && reportData.attendance.recent.length > 0 && (
                                    <div className="pt-4 border-t">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Recent Attendance</p>
                                        <div className="space-y-1">
                                            {reportData.attendance.recent.slice(0, 5).map((record, index) => (
                                                <div key={index} className="flex justify-between text-xs">
                                                    <span className="text-gray-600">
                                                        {new Date(record.date).toLocaleDateString("en-IN")}
                                                    </span>
                                                    <span
                                                        className={`font-semibold ${record.status === "present"
                                                            ? "text-green-600"
                                                            : record.status === "absent"
                                                                ? "text-red-600"
                                                                : "text-yellow-600"
                                                            }`}
                                                    >
                                                        {record.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fee Details */}
                        <div
                            ref={(el) => (sectionRefs.current["fee-details"] = el)}
                            data-section="fee-details"
                            className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("fee-details") ? "animate-slide-in" : ""}`}
                        >
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                                Fee Details
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Total Fee</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        ₹{(reportData.fees?.totalFee || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Amount Paid</span>
                                    <span className="text-sm font-semibold text-green-600">
                                        ₹{(reportData.fees?.paid || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Amount Pending</span>
                                    <span className="text-sm font-semibold text-red-600">
                                        ₹{(reportData.fees?.pending || 0).toLocaleString()}
                                    </span>
                                </div>
                                {reportData.fees?.overdue > 0 && (
                                    <div className="flex justify-between bg-red-50 p-2 rounded">
                                        <span className="text-sm text-red-900 font-medium">Overdue Amount</span>
                                        <span className="text-sm font-bold text-red-600">
                                            ₹{(reportData.fees.overdue || 0).toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                {/* Recent Payments - FIXED */}
                                {reportData.fees?.recentPayments &&
                                    Array.isArray(reportData.fees.recentPayments) &&
                                    reportData.fees.recentPayments.length > 0 && (
                                        <div className="pt-4 border-t">
                                            <p className="text-sm font-medium text-gray-700 mb-2">Recent Payments</p>
                                            <div className="space-y-2">
                                                {reportData.fees.recentPayments
                                                    .filter(payment => payment && typeof payment === 'object') // ✅ Filter out invalid entries
                                                    .map((payment, index) => (
                                                        <div key={index} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                                                            <div>
                                                                <span className="text-gray-600">
                                                                    {payment.date
                                                                        ? new Date(payment.date).toLocaleDateString("en-IN")
                                                                        : "N/A"
                                                                    }
                                                                </span>
                                                                <span className="text-gray-500 ml-2">
                                                                    ({payment.method || "N/A"})
                                                                </span>
                                                            </div>
                                                            <span className="font-semibold text-green-600">
                                                                ₹{typeof payment.amount === 'number'
                                                                    ? payment.amount.toLocaleString()
                                                                    : '0'
                                                                }
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </div>


                        {/* Academic Performance */}
                        {reportData.marks && (
                            <div
                                ref={(el) => (sectionRefs.current["academic-performance"] = el)}
                                data-section="academic-performance"
                                className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("academic-performance") ? "animate-slide-in" : ""}`}
                            >
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <BookOpen className="h-5 w-5 mr-2 text-indigo-600" />
                                    Academic Performance
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Average Percentage</span>
                                        <span className="text-xl font-bold text-indigo-600">
                                            {reportData.marks.average || 0}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Grade</span>
                                        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
                                            {reportData.marks.grade || "N/A"}
                                        </span>
                                    </div>

                                    {reportData.marks.subjects && reportData.marks.subjects.length > 0 && (
                                        <div className="pt-4 border-t">
                                            <p className="text-sm font-medium text-gray-700 mb-2">Subject-wise Marks</p>
                                            <div className="space-y-2">
                                                {reportData.marks.subjects.map((subject, index) => (
                                                    <div key={index} className="flex justify-between text-xs">
                                                        <span className="text-gray-600">{subject.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-900 font-medium">
                                                                {subject.marks}/{subject.total}
                                                            </span>
                                                            <span className="text-indigo-600 font-bold">
                                                                ({subject.percentage}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Gate Entries */}
                        <div
                            ref={(el) => (sectionRefs.current["gate-entries"] = el)}
                            data-section="gate-entries"
                            className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("gate-entries") ? "animate-slide-in" : ""}`}
                        >
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <LogIn className="h-5 w-5 mr-2 text-blue-600" />
                                Gate Entries (This Month)
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">IN Entries</span>
                                    <span className="text-lg font-bold text-green-600">
                                        {reportData.gateEntries?.inCount || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">OUT Entries</span>
                                    <span className="text-lg font-bold text-red-600">
                                        {reportData.gateEntries?.outCount || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !reportData && selectedStudent && (
                <div className="text-center py-12 bg-white rounded-lg border">
                    <User className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No Report Data</h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Failed to load report for selected student
                    </p>
                </div>
            )}

            {/* No Selection State */}
            {!loading && !selectedStudent && (
                <div className="text-center py-12 bg-white rounded-lg border">
                    <User className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Select a Student</h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Search and select a student to view their complete report
                    </p>
                </div>
            )}
        </div>
    );
};

export default StudentReportsTab;
