// src/components/Attendance/ViewLeaveModal.jsx
import React from "react";
import { X, Calendar, User, Phone, MapPin, FileText } from "lucide-react";

const ViewLeaveModal = ({ application, onClose }) => {
  if (!application) return null;

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      approved: "bg-green-100 text-green-800 border-green-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
      cancelled: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getLeaveTypeIcon = (type) => {
    const icons = {
      sick: "🤒",
      home: "🏠",
      emergency: "🚨",
      vacation: "🏖️",
      personal: "👤",
      other: "📋",
    };
    return icons[type] || "📋";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">
              {getLeaveTypeIcon(application.leaveType)}
            </span>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Leave Application Details
              </h3>
              <p className="text-sm text-gray-500">
                Application ID: {application._id.slice(-8)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(
                application.status
              )}`}
            >
              Status: {application.status.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">
              Applied on{" "}
              {new Date(application.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Student Information */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
              <User className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">
                Student Information
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{application.student.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Roll Number</p>
                <p className="font-medium">{application.student.rollNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Block</p>
                <p className="font-medium">{application.student.block}</p>
              </div>
              {application.student.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-sm">
                    {application.student.email}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Leave Details */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <Calendar className="h-5 w-5 text-gray-600" />
              <h4 className="font-semibold text-gray-900">Leave Details</h4>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-600">Leave Type</p>
                  <p className="font-medium capitalize">
                    {application.leaveType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{application.totalDays} days</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-600">From Date</p>
                  <p className="font-medium">{application.fromDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">To Date</p>
                  <p className="font-medium">{application.toDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center space-x-3 mb-2">
              <FileText className="h-5 w-5 text-yellow-600" />
              <h4 className="font-semibold text-gray-900">Reason for Leave</h4>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">
              {application.reason}
            </p>
          </div>

          {/* Contact Information */}
          {(application.contactNumber ||
            application.emergencyContact ||
            application.destinationAddress) && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-3 mb-3">
                <Phone className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-gray-900">
                  Contact Information
                </h4>
              </div>
              <div className="space-y-2">
                {application.contactNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Contact Number</p>
                    <p className="font-medium">{application.contactNumber}</p>
                  </div>
                )}
                {application.emergencyContact && (
                  <div>
                    <p className="text-sm text-gray-600">Emergency Contact</p>
                    <p className="font-medium">
                      {application.emergencyContact}
                    </p>
                  </div>
                )}
                {application.destinationAddress && (
                  <div>
                    <p className="text-sm text-gray-600">Destination Address</p>
                    <p className="font-medium">
                      {application.destinationAddress}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approval/Rejection Details */}
          {application.status === "approved" && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                Approval Details
              </h4>
              <div className="space-y-2">
                {application.approvedBy && (
                  <div>
                    <p className="text-sm text-gray-600">Approved By</p>
                    <p className="font-medium">{application.approvedBy.name}</p>
                  </div>
                )}
                {application.approvedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Approved On</p>
                    <p className="font-medium">
                      {new Date(application.approvedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
                {application.adminNotes && (
                  <div>
                    <p className="text-sm text-gray-600">Admin Notes</p>
                    <p className="font-medium">{application.adminNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {application.status === "rejected" && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                Rejection Details
              </h4>
              <div className="space-y-2">
                {application.rejectedBy && (
                  <div>
                    <p className="text-sm text-gray-600">Rejected By</p>
                    <p className="font-medium">{application.rejectedBy.name}</p>
                  </div>
                )}
                {application.rejectedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Rejected On</p>
                    <p className="font-medium">
                      {new Date(application.rejectedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
                {application.rejectionReason && (
                  <div>
                    <p className="text-sm text-gray-600">Reason</p>
                    <p className="font-medium">{application.rejectionReason}</p>
                  </div>
                )}
                {application.adminNotes && (
                  <div>
                    <p className="text-sm text-gray-600">Admin Notes</p>
                    <p className="font-medium">{application.adminNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewLeaveModal;
