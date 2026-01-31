import React from "react";
import { Link } from "react-router-dom";
import { User, Eye, FileText, Calendar, Phone, Mail, X } from "lucide-react";

const StudentCard = ({ student }) => {
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const viewDocument = (documentUrl) => {
    if (documentUrl) {
      window.open(documentUrl, "_blank");
    }
  };

  // All document types
  const docTypes = [
    { key: "aadharCard", label: "Aadhar", color: "blue" },
    { key: "addressProof", label: "Address", color: "green" },
    { key: "collegeId", label: "College ID", color: "purple" },
    { key: "schoolId", label: "School ID", color: "orange" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300 border border-gray-300 overflow-hidden flex flex-col h-full hover:-translate-y-1">
      {/* Student Photo Section */}
      <div className="relative w-full h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex justify-center items-center overflow-hidden">
        {student.documents?.photo?.url ? (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={student.documents.photo.url}
              alt={student.name}
              className="h-full w-auto max-w-full object-contain"
              style={{ maxHeight: '160px' }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <div className="text-primary-600 text-4xl font-bold">
              {getInitials(student.name)}
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
              student.status === "active"
                ? "bg-green-100 text-green-800"
                : student.status === "inactive"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {student.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Student Information */}
      <div className="p-4 flex flex-col flex-1 justify-between bg-white">
        <div>
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {student.name}
            </h3>
            <div className="text-xs text-gray-500 mt-1">
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                {student.studentId}
              </span>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center text-xs text-gray-600 truncate">
              <div className="w-4">
                <Mail className="h-3 w-3 text-gray-400" />
              </div>
              <span className="ml-1 truncate">{student.email || 'No email'}</span>
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <div className="w-4">
                <Phone className="h-3 w-3 text-gray-400" />
              </div>
              <span className="ml-1">{student.phone || 'No phone'}</span>
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <div className="w-4">
                <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="ml-1">{student.class || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link
          to={`/students/${student._id}`}
          className="mt-3 w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-[1.02] shadow-sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Link>
      </div>
    </div>
  );
};

export default StudentCard;
