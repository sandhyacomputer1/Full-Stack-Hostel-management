import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { studentsAPI } from "../../services/api";
import {
  ArrowLeft,
  Edit,
  User,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Calendar,
  Home,
  Award,
  CreditCard,
  BookOpen,
  Utensils,
  DoorOpen,
  FileText,
} from "lucide-react";
import LoadingSpinner from "../../components/UI/LoadingSpinner";

// Import all tab components
import OverviewTab from "../../components/Students/OverviewTab";
import AttendanceTab from "../../components/Students/AttendanceTab";
import MarksTab from "../../components/Students/MarksTab";
import FeesTab from "../../components/Students/FeesTab";
import GateAttendanceTab from "../../components/Students/GateAttendanceTab";
import MessAttendanceTab from "../../components/Students/MessAttendanceTab";
import CompleteReportTab from "../../components/Students/CompleteReportTab";

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // ========= MAIN STUDENT DATA (ALWAYS FETCHED) =========
  const {
    data: studentData,
    isLoading: studentLoading,
    error: studentError,
  } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const res = await studentsAPI.getById(id);
      console.log("✅ Student Details API Response:", res.data);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
  });

  // ========= CONDITIONAL TAB DATA =========

  // Attendance
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["student-attendance", id],
    queryFn: async () => {
      const res = await studentsAPI.getAttendance(id, { limit: 50 });
      return res.data;
    },
    staleTime: 1000 * 60 * 3,
    enabled: !!id && activeTab === "attendance",
  });

  // Marks
  const { data: marksData, isLoading: marksLoading } = useQuery({
    queryKey: ["student-marks", id],
    queryFn: async () => {
      const res = await studentsAPI.getMarks(id, { limit: 50 });
      return res.data;
    },
    staleTime: 1000 * 60 * 3,
    enabled: !!id && activeTab === "marks",
  });

  // Fees – PAID
  const { data: paidFeesData, isLoading: paidFeesLoading } = useQuery({
    queryKey: ["student-fees-paid", id],
    queryFn: async () => {
      const res = await studentsAPI.getPaidFees(id, { limit: 50 });
      return res.data;
    },
    staleTime: 1000 * 60 * 3,
    enabled: !!id && activeTab === "fees",
  });

  // Fees – UNPAID / OVERDUE
  const { data: unpaidFeesData, isLoading: unpaidFeesLoading } = useQuery({
    queryKey: ["student-fees-unpaid", id],
    queryFn: async () => {
      const res = await studentsAPI.getUnpaidFees(id);
      return res.data;
    },
    staleTime: 1000 * 60 * 3,
    enabled: !!id && activeTab === "fees",
  });

  // Gate entries
  const { data: gateData, isLoading: gateLoading } = useQuery({
    queryKey: ["student-gate", id],
    queryFn: async () => {
      const res = await studentsAPI.getGateEntries(id, { limit: 50 });
      return res.data;
    },
    staleTime: 1000 * 60 * 3,
    enabled: !!id && activeTab === "gate",
  });

  // Mess attendance
  const { data: messData, isLoading: messLoading } = useQuery({
    queryKey: ["student-mess", id],
    queryFn: async () => {
      const res = await studentsAPI.getMessAttendance(id, { limit: 50 });
      return res.data;
    },
    staleTime: 1000 * 60 * 3,
    enabled: !!id && activeTab === "mess",
  });

  // Complete report
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["student-report", id],
    queryFn: async () => {
      const res = await studentsAPI.getCompleteReport(id);
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!id && activeTab === "report",
  });

  // ========= LOADING / ERROR =========

  if (studentLoading) {
    console.log("⏳ Loading student data...");
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (studentError) {
    console.log("❌ Error loading student:", studentError);
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading student
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {studentError.response?.data?.message ||
                "Failed to load student details"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log("📊 Student Data Received:", studentData);
  const student = studentData?.student;
  const feeSummary = studentData?.feeSummary;

  if (!student) {
    console.log("❌ No student data found");
    return null;
  }

  console.log("✅ Student object:", student);

  const tabs = [
    { id: "overview", name: "Overview", icon: User },
    { id: "attendance", name: "Attendance", icon: Calendar },
    { id: "marks", name: "Marks", icon: Award },
    { id: "fees", name: "Fees", icon: CreditCard },
    { id: "gate", name: "Gate Entry", icon: DoorOpen },
    { id: "mess", name: "Mess", icon: Utensils },
    { id: "report", name: "Complete Report", icon: FileText },
  ];

  // ========= RENDER TAB CONTENT =========

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab student={student} feeSummary={feeSummary} />;

      case "attendance":
        return (
          <AttendanceTab
            attendanceData={attendanceData}
            isLoading={attendanceLoading}
          />
        );

      case "marks":
        return <MarksTab marksData={marksData} isLoading={marksLoading} />;

      case "fees":
        return (
          <FeesTab
            paidFeesData={paidFeesData}
            unpaidFeesData={unpaidFeesData}
            isLoading={paidFeesLoading || unpaidFeesLoading}
          />
        );

      case "gate":
        return (
          <GateAttendanceTab gateData={gateData} isLoading={gateLoading} />
        );

      case "mess":
        return (
          <MessAttendanceTab messData={messData} isLoading={messLoading} />
        );

      case "report":
        return <CompleteReportTab studentId={id} />;

      default:
        return <OverviewTab student={student} feeSummary={feeSummary} />;
    }
  };

  // ========= MAIN RENDER =========

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/students")}
            className="p-3 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl mr-4 transition-all duration-200 hover:shadow-md border border-transparent hover:border-indigo-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {student.studentId} • {student.class} • {student.batch}
            </p>
          </div>
        </div>
        <Link
          to={`/students/edit/${student._id}`}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 transform hover:-translate-y-0.5 border border-transparent hover:border-indigo-400"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Student
        </Link>
      </div>

      {/* Student Info Card */}
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 p-6 transform hover:scale-[1.01]">
        <div className="flex items-start space-x-6">
          <div className="h-28 w-28 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
            {student.documents?.photo?.url ? (
              <img
                src={student.documents.photo.url}
                alt={student.name}
                className="h-28 w-28 object-cover"
              />
            ) : (
              <User className="h-14 w-14 text-indigo-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Contact Information */}
              <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all duration-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-indigo-500" />
                  Contact Information
                </h3>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center text-sm text-gray-900 p-2 rounded hover:bg-white transition-all duration-200">
                    <Phone className="h-4 w-4 mr-3 text-indigo-400" />
                    <span className="font-medium">{student.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-900 p-2 rounded hover:bg-white transition-all duration-200">
                    <Mail className="h-4 w-4 mr-3 text-indigo-400" />
                    <span className="font-medium">{student.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-900 p-2 rounded hover:bg-white transition-all duration-200">
                    <MapPin className="h-4 w-4 mr-3 text-indigo-400" />
                    <span className="font-medium">{student.address?.city}, {student.address?.state}</span>
                  </div>
                </div>
              </div>

              {/* Academic Details */}
              <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all duration-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
                  Academic Details
                </h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-white transition-all duration-200">
                    <span className="text-gray-600">Class:</span>
                    <span className="font-medium text-gray-900">{student.class}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-white transition-all duration-200">
                    <span className="text-gray-600">Batch:</span>
                    <span className="font-medium text-gray-900">{student.batch}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-white transition-all duration-200">
                    <span className="text-gray-600">Roll No:</span>
                    <span className="font-medium text-gray-900">{student.rollNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-white transition-all duration-200">
                    <span className="text-gray-600">Room:</span>
                    <span className="font-medium text-gray-900">{student.roomNumber || "Not assigned"}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all duration-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Award className="h-4 w-4 mr-2 text-indigo-500" />
                  Status
                </h3>
                <div className="mt-2 space-y-2">
                  <div className="p-2 rounded hover:bg-white transition-all duration-200">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        student.status === "active"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : student.status === "inactive"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                      }`}
                    >
                      {student.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-white transition-all duration-200">
                    <span className="text-gray-600">Joined:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(student.admissionDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col items-center justify-center gap-1 px-2 py-3 font-medium text-xs rounded-lg transition-all duration-200 border border-transparent
                    ${activeTab === tab.id
                      ? "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm transform scale-[1.02]"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-200"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default StudentDetail;
