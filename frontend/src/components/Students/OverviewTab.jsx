// src/components/Students/Tabs/OverviewTab.jsx
import React from "react";
import { Users, MapPin, Phone, Mail, Calendar, CreditCard, Eye, Download, FileText } from "lucide-react";

const OverviewTab = ({ student, feeSummary }) => {
  if (!student) return null;

  const documents = student.documents || {};

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-primary-600" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard
            label="Aadhar Number"
            value={student.aadharNumber}
            icon={<Users className="h-4 w-4" />}
          />
          <InfoCard
            label="Blood Group"
            value={student.bloodGroup}
            icon={<Users className="h-4 w-4" />}
          />
          <InfoCard
            label="Date of Birth"
            value={new Date(student.dateOfBirth).toLocaleDateString("en-IN")}
            icon={<Calendar className="h-4 w-4" />}
          />
          <InfoCard
            label="Gender"
            value={student.gender}
            icon={<Users className="h-4 w-4" />}
          />
          <InfoCard
            label="Phone"
            value={student.phone}
            icon={<Phone className="h-4 w-4" />}
          />
          <InfoCard
            label="Email"
            value={student.email}
            icon={<Mail className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-primary-600" />
          Address
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            {student.address?.street && `${student.address.street}, `}
            {student.address?.city && `${student.address.city}, `}
            {student.address?.state && `${student.address.state} - `}
            {student.address?.pincode}
            {student.address?.country && `, ${student.address.country}`}
          </p>
        </div>
      </div>

      {/* Parents Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Parents Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Father */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Father
            </h4>
            <div className="space-y-2">
              <DetailRow label="Name" value={student.father?.name} />
              <DetailRow label="Phone" value={student.father?.phone} />
              <DetailRow label="Email" value={student.father?.email || "N/A"} />
              <DetailRow
                label="Occupation"
                value={student.father?.occupation || "N/A"}
              />
            </div>
          </div>

          {/* Mother */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200">
            <h4 className="font-semibold text-pink-900 mb-3 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Mother
            </h4>
            <div className="space-y-2">
              <DetailRow label="Name" value={student.mother?.name} />
              <DetailRow label="Phone" value={student.mother?.phone || "N/A"} />
              <DetailRow label="Email" value={student.mother?.email || "N/A"} />
              <DetailRow
                label="Occupation"
                value={student.mother?.occupation || "N/A"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fee Summary */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-primary-600" />
          Fee Summary
        </h3>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <FeeCard
              label="Base Fee"
              value={`₹${feeSummary?.baseFee?.toLocaleString() || 0}`}
              color="text-gray-900"
            />
            <FeeCard
              label="Total Paid"
              value={`₹${feeSummary?.totalPaid?.toLocaleString() || 0}`}
              color="text-green-600"
            />
            <FeeCard
              label="Due Amount"
              value={`₹${feeSummary?.dueAmount?.toLocaleString() || 0}`}
              color="text-red-600"
            />
            <FeeCard
              label="Total Installments"
              value={feeSummary?.totalInstallments || 0}
              color="text-blue-600"
            />
            <FeeCard
              label="Paid"
              value={feeSummary?.paidInstallments || 0}
              color="text-green-600"
            />
            <FeeCard
              label="Pending"
              value={feeSummary?.unpaidInstallments || 0}
              color="text-orange-600"
            />
          </div>
        </div>
      </div>

      {/* Hostel Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Hostel Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard label="Room Number" value={student.roomNumber || "N/A"} />
          <InfoCard label="Hostel Block" value={student.hostelBlock || "N/A"} />
          <InfoCard
            label="Admission Date"
            value={new Date(student.admissionDate).toLocaleDateString("en-IN")}
          />
          <InfoCard
            label="Current State"
            value={
              <span
                className={`badge ${
                  student.currentHostelState === "IN"
                    ? "badge-success"
                    : "badge-warning"
                }`}
              >
                {student.currentHostelState || "IN"}
              </span>
            }
          />
        </div>
      </div>

      {/* Documents (NEW SECTION at bottom) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-indigo-600" />
          Documents
        </h3>
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 p-4 space-y-4">
          <DocumentRow label="Photo" doc={documents.photo} />
          <DocumentRow label="Aadhar Card" doc={documents.aadharCard} />
          <DocumentRow label="Address Proof" doc={documents.addressProof} />
          <DocumentRow label="ID Card" doc={documents.idCard} />
        </div>
      </div>
    </div>
  );
};

// Helper Components
const InfoCard = ({ label, value, icon }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center text-sm text-gray-500 mb-1">
      {icon && <span className="mr-2 text-gray-400">{icon}</span>}
      {label}
    </div>
    <div className="text-base font-medium text-gray-900">{value || "N/A"}</div>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-gray-600">{label}:</span>
    <span className="font-medium text-gray-900">{value || "N/A"}</span>
  </div>
);

const FeeCard = ({ label, value, color }) => (
  <div className="text-center">
    <div className="text-xs text-gray-600 mb-1">{label}</div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
  </div>
);

// Single document row with View / Download
const DocumentRow = ({ label, doc }) => {
  const hasFile = doc?.url;

  const handleView = () => {
    if (!hasFile) return;
    window.open(doc.url, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    if (!hasFile) return;
    const link = document.createElement("a");
    link.href = doc.url;
    link.download = label.replace(/\s+/g, "_").toLowerCase();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-100 hover:border-indigo-100">
      <div className="flex items-center space-x-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
          hasFile 
            ? 'bg-indigo-100 text-indigo-600' 
            : 'bg-gray-100 text-gray-400'
        }`}>
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">{label}</div>
          <div className="text-xs text-gray-500">
            {hasFile
              ? `Uploaded on ${new Date(doc.uploadedAt).toLocaleString("en-IN")}`
              : "Not uploaded"}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleView}
          disabled={!hasFile}
          className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 border ${
            hasFile
              ? 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-md transform hover:-translate-y-0.5'
              : 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
          }`}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!hasFile}
          className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 border ${
            hasFile
              ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 hover:shadow-md transform hover:-translate-y-0.5'
              : 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
          }`}
        >
          <Download className="h-3 w-3 mr-1" />
          Download
        </button>
      </div>
    </div>
  );
};

export default OverviewTab;
