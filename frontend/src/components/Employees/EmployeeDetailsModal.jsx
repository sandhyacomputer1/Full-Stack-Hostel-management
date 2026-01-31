import React, { useState, useEffect } from "react";
import {
    X,
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Briefcase,
    IndianRupee,
    Shield,
    Clock,
    AlertCircle,
    Edit,
    FileText,
    Download,
    Eye,
    CheckCircle,
    XCircle,
    TrendingUp,
    LogIn,
    LogOut,
    Activity
} from "lucide-react";
import { employeesAPI, employeeAttendanceAPI } from "../../services/api";
import LoadingSpinner from "../UI/LoadingSpinner";
import { format } from "date-fns";

const EmployeeDetailsModal = ({ isOpen, onClose, employeeId, onEdit }) => {
    const [employee, setEmployee] = useState(null);
    const [attendanceStats, setAttendanceStats] = useState(null);
    const [recentAttendance, setRecentAttendance] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        if (isOpen && employeeId) {
            fetchEmployeeDetails();
            fetchAttendanceData();
        }
    }, [isOpen, employeeId]);

    const fetchEmployeeDetails = async () => {
        try {
            setLoading(true);
            const response = await employeesAPI.getById(employeeId);
            setEmployee(response.data.employee);
            console.log("✅ Employee data loaded:", response.data.employee);
        } catch (error) {
            console.error("❌ Error fetching employee:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceData = async () => {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            console.log("📅 Fetching attendance for date range:", {
                start: startOfMonth.toISOString(),
                end: endOfMonth.toISOString()
            });

            const recordsResponse = await employeeAttendanceAPI.getRecordsByEmployee(
                employeeId,
                {
                    startDate: startOfMonth.toISOString().split('T')[0],
                    endDate: endOfMonth.toISOString().split('T')[0],
                    limit: 50
                }
            );

            console.log("✅ Attendance response:", recordsResponse.data);

            const dailyRecords = recordsResponse.data.data ||
                recordsResponse.data.records ||
                recordsResponse.data ||
                [];

            console.log("📋 Daily records:", dailyRecords);

            // ✅ FIX: Flatten entries from daily records into individual entries
            const allEntries = [];
            dailyRecords.forEach(dayRecord => {
                if (dayRecord.entries && Array.isArray(dayRecord.entries)) {
                    dayRecord.entries.forEach(entry => {
                        allEntries.push({
                            _id: entry._id || `${dayRecord._id}-${entry.type}`,
                            date: dayRecord.date,
                            type: entry.type,
                            timestamp: entry.timestamp,
                            source: entry.source || 'manual'
                        });
                    });
                }
            });

            console.log("📋 Flattened entries:", allEntries);

            setRecentAttendance(allEntries.slice(0, 10));

            // Calculate stats
            const stats = calculateAttendanceStats(dailyRecords, startOfMonth, endOfMonth);
            setAttendanceStats(stats);

            console.log("📊 Calculated stats:", stats);

        } catch (error) {
            console.error("❌ Error fetching attendance:", error);
            setAttendanceStats({
                presentDays: 0,
                absentDays: 0,
                totalHours: 0,
                overtimeHours: 0
            });
            setRecentAttendance([]);
        }
    };

    // ✅ FIXED: Calculate stats from daily records with entries array
    const calculateAttendanceStats = (dailyRecords, startDate, endDate) => {
        try {
            let totalHours = 0;
            let overtimeHours = 0;
            let presentDays = 0;

            dailyRecords.forEach(dayRecord => {
                if (!dayRecord.entries || dayRecord.entries.length === 0) return;

                // Find IN and OUT entries for the day
                const inEntry = dayRecord.entries.find(e => e.type === 'IN');
                const outEntry = dayRecord.entries.find(e => e.type === 'OUT');

                if (inEntry) {
                    presentDays++;

                    if (outEntry && inEntry.timestamp && outEntry.timestamp) {
                        const inTime = new Date(inEntry.timestamp);
                        const outTime = new Date(outEntry.timestamp);

                        if (!isNaN(inTime.getTime()) && !isNaN(outTime.getTime())) {
                            const hours = (outTime - inTime) / (1000 * 60 * 60);
                            totalHours += hours;

                            if (hours > 8) {
                                overtimeHours += (hours - 8);
                            }
                        }
                    }
                }
            });

            // Calculate working days in the month (excluding Sundays)
            let workingDays = 0;
            const currentDate = new Date(startDate);
            const today = new Date();

            while (currentDate <= endDate && currentDate <= today) {
                if (currentDate.getDay() !== 0) {
                    workingDays++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const absentDays = Math.max(0, workingDays - presentDays);

            return {
                presentDays,
                absentDays,
                totalHours: Math.round(totalHours * 10) / 10,
                overtimeHours: Math.round(overtimeHours * 10) / 10
            };
        } catch (error) {
            console.error("❌ Error calculating stats:", error);
            return {
                presentDays: 0,
                absentDays: 0,
                totalHours: 0,
                overtimeHours: 0
            };
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
                    onClick={onClose}
                ></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
                    &#8203;
                </span>

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
                    {loading ? (
                        <div className="p-12">
                            <LoadingSpinner />
                        </div>
                    ) : !employee ? (
                        <div className="p-12 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <p className="text-gray-600">Failed to load employee details</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        {employee.profilePhoto?.url ? (
                                            <img
                                                src={employee.profilePhoto.url}
                                                alt={employee.fullName}
                                                className="w-16 h-16 rounded-full border-4 border-white object-cover"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                                                <User className="w-8 h-8 text-primary-600" />
                                            </div>
                                        )}
                                        <div className="text-white">
                                            <h2 className="text-2xl font-bold">{employee.fullName}</h2>
                                            <p className="text-primary-100 text-sm">{employee.employeeCode}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => {
                                                onClose();
                                                onEdit?.(employee);
                                            }}
                                            className="px-4 py-2 bg-white text-primary-600 rounded-lg hover:bg-primary-50 font-medium flex items-center space-x-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="text-white hover:text-primary-100 p-2"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-4">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold ${employee.status === "ACTIVE"
                                            ? "bg-green-500 text-white"
                                            : "bg-red-500 text-white"
                                            }`}
                                    >
                                        {employee.status}
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-primary-600">
                                        {employee.role?.replace("_", " ").toUpperCase()}
                                    </span>
                                    {employee.currentStatus === "IN" ? (
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white flex items-center gap-1">
                                            <LogIn className="w-3 h-3" />
                                            Currently IN
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700 flex items-center gap-1">
                                            <LogOut className="w-3 h-3" />
                                            Currently OUT
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-gray-200 bg-gray-50">
                                <div className="flex space-x-8 px-6">
                                    <button
                                        onClick={() => setActiveTab("overview")}
                                        className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "overview"
                                            ? "border-primary-600 text-primary-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                            }`}
                                    >
                                        Overview
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("attendance")}
                                        className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "attendance"
                                            ? "border-primary-600 text-primary-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                            }`}
                                    >
                                        Attendance
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("documents")}
                                        className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "documents"
                                            ? "border-primary-600 text-primary-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                            }`}
                                    >
                                        Documents
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                {activeTab === "overview" && (
                                    <OverviewTab employee={employee} />
                                )}
                                {activeTab === "attendance" && (
                                    <AttendanceTab
                                        stats={attendanceStats}
                                        recentRecords={recentAttendance}
                                        employee={employee}
                                    />
                                )}
                                {activeTab === "documents" && (
                                    <DocumentsTab employee={employee} />
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ✅ Overview Tab
const OverviewTab = ({ employee }) => {
    return (
        <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-primary-600" />
                    Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem icon={Phone} label="Phone" value={employee.phone} />
                    <InfoItem
                        icon={Mail}
                        label="Email"
                        value={employee.email || "Not provided"}
                    />
                    <InfoItem icon={User} label="Gender" value={employee.gender || "N/A"} />
                    <InfoItem
                        icon={Calendar}
                        label="Date of Birth"
                        value={
                            employee.dateOfBirth
                                ? format(new Date(employee.dateOfBirth), "MMM dd, yyyy")
                                : "N/A"
                        }
                    />
                </div>
            </div>

            {/* Employment Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
                    Employment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem
                        icon={Briefcase}
                        label="Department"
                        value={employee.department || "N/A"}
                    />
                    <InfoItem
                        icon={IndianRupee}
                        label="Salary"
                        value={`₹${employee.salary?.toLocaleString("en-IN")}/month`}
                    />
                    <InfoItem
                        icon={Calendar}
                        label="Joining Date"
                        value={
                            employee.joiningDate
                                ? format(new Date(employee.joiningDate), "MMM dd, yyyy")
                                : "N/A"
                        }
                    />
                    <InfoItem
                        icon={Clock}
                        label="Shift"
                        value={employee.shift || "GENERAL"}
                    />
                    <InfoItem
                        icon={FileText}
                        label="Employment Type"
                        value={employee.employmentType || "FULL_TIME"}
                    />
                    {employee.userId && (
                        <InfoItem
                            icon={Shield}
                            label="Login Access"
                            value="Enabled"
                            valueClass="text-green-600 font-semibold"
                        />
                    )}
                </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-orange-600" />
                    Address
                </h3>
                <p className="text-gray-700">{employee.address || "No address provided"}</p>
            </div>

            {/* Emergency Contact */}
            {employee.emergencyContact && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        Emergency Contact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoItem
                            icon={User}
                            label="Name"
                            value={employee.emergencyContact.name}
                            lightBg
                        />
                        <InfoItem
                            icon={Phone}
                            label="Phone"
                            value={employee.emergencyContact.phone}
                            lightBg
                        />
                        <InfoItem
                            icon={User}
                            label="Relation"
                            value={employee.emergencyContact.relation}
                            lightBg
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// ✅ Attendance Tab - FIXED to handle flattened entries
const AttendanceTab = ({ stats, recentRecords, employee }) => {
    // Validate records
    const validRecords = recentRecords.filter(record => {
        if (!record.timestamp) {
            console.warn("⚠️ Skipping record with no timestamp:", record);
            return false;
        }
        const date = new Date(record.timestamp);
        if (isNaN(date.getTime())) {
            console.warn("⚠️ Skipping record with invalid timestamp:", record.timestamp);
            return false;
        }
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    icon={CheckCircle}
                    label="Present Days"
                    value={stats?.presentDays || 0}
                    color="green"
                />
                <StatCard
                    icon={XCircle}
                    label="Absent Days"
                    value={stats?.absentDays || 0}
                    color="red"
                />
                <StatCard
                    icon={Clock}
                    label="Total Hours"
                    value={`${stats?.totalHours || 0}h`}
                    color="blue"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Overtime"
                    value={`${stats?.overtimeHours || 0}h`}
                    color="purple"
                />
            </div>

            {/* Recent Attendance */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-primary-600" />
                    Recent Attendance Records ({validRecords.length})
                </h3>

                {validRecords.length === 0 ? (
                    <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No attendance records yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {validRecords.map((record) => {
                            const timestamp = new Date(record.timestamp);
                            return (
                                <div
                                    key={record._id}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center ${record.type === "IN"
                                                ? "bg-green-100 text-green-600"
                                                : "bg-red-100 text-red-600"
                                                }`}
                                        >
                                            {record.type === "IN" ? (
                                                <LogIn className="w-5 h-5" />
                                            ) : (
                                                <LogOut className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {record.type === "IN" ? "Check In" : "Check Out"}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {format(timestamp, "MMM dd, yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">
                                            {format(timestamp, "hh:mm a")}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">
                                            {record.source || "manual"}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// ✅ Documents Tab
const DocumentsTab = ({ employee }) => {
    const documents = employee.documents || [];

    const allDocuments = [];

    if (employee.profilePhoto?.url) {
        allDocuments.push({
            type: 'profile_photo',
            fileUrl: employee.profilePhoto.url,
            uploadedAt: employee.profilePhoto.uploadedAt || employee.createdAt,
            verified: true
        });
    }

    allDocuments.push(...documents);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary-600" />
                Uploaded Documents ({allDocuments.length})
            </h3>

            {allDocuments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No documents uploaded</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allDocuments.map((doc, index) => (
                        <div
                            key={`${doc.type}-${index}`}
                            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 capitalize">
                                        {doc.type?.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {doc.uploadedAt
                                            ? `Uploaded ${format(new Date(doc.uploadedAt), "MMM dd, yyyy")}`
                                            : 'Upload date unknown'
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View document"
                                >
                                    <Eye className="w-4 h-4" />
                                </a>
                                <a
                                    href={doc.fileUrl}
                                    download
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Download document"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper Components
const InfoItem = ({ icon: Icon, label, value, valueClass = "", lightBg = false }) => (
    <div className={`${lightBg ? "bg-white" : ""} p-3 rounded-lg`}>
        <div className="flex items-center text-sm text-gray-500 mb-1">
            <Icon className="w-4 h-4 mr-2" />
            {label}
        </div>
        <p className={`font-semibold text-gray-900 ${valueClass}`}>{value}</p>
    </div>
);

const StatCard = ({ icon: Icon, label, value, color }) => {
    const colors = {
        green: "bg-green-100 text-green-600",
        red: "bg-red-100 text-red-600",
        blue: "bg-blue-100 text-blue-600",
        purple: "bg-purple-100 text-purple-600",
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetailsModal;
