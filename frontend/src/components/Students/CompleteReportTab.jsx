// src/components/Students/Tabs/CompleteReportTab.jsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentsAPI } from "../../services/api";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  BookOpen,
  Clock,
  UtensilsCrossed,
} from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";
import toast from "react-hot-toast";

const CompleteReportTab = ({ studentId }) => {
  const [isExporting, setIsExporting] = useState(false);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["complete-report", studentId],
    queryFn: async () => {
      const res = await studentsAPI.getCompleteReport(studentId);
      return res.data;
    },
    enabled: !!studentId,
  });

  const handleExportPDF = () => {
    setIsExporting(true);
    toast.success("PDF export feature coming soon!");
    setTimeout(() => setIsExporting(false), 1000);
  };

  const handleExportExcel = () => {
    if (!reportData?.data) return;

    const data = reportData.data;
    const student = data.student;

    // Create CSV content
    let csv = "COMPLETE STUDENT REPORT\n\n";

    // Student Details
    csv += "PERSONAL INFORMATION\n";
    csv += `Name,${student.name}\n`;
    csv += `Student ID,${student.studentId}\n`;
    csv += `Class,${student.class}\n`;
    csv += `Batch,${student.batch}\n`;
    csv += `Roll Number,${student.rollNumber}\n`;
    csv += `Phone,${student.phone}\n`;
    csv += `Email,${student.email}\n`;
    csv += `Blood Group,${student.bloodGroup}\n`;
    csv += `Gender,${student.gender}\n\n`;

    // Address
    csv += "ADDRESS\n";
    csv += `${student.address?.street || ""}, ${student.address?.city || ""}, ${
      student.address?.state || ""
    } - ${student.address?.pincode || ""}\n\n`;

    // Parents
    csv += "PARENTS INFORMATION\n";
    csv += `Father Name,${student.father?.name || ""}\n`;
    csv += `Father Phone,${student.father?.phone || ""}\n`;
    csv += `Mother Name,${student.mother?.name || ""}\n`;
    csv += `Mother Phone,${student.mother?.phone || ""}\n\n`;

    // Fee Summary
    csv += "FEE SUMMARY\n";
    csv += `Base Fee,${data.feeSummary?.baseFee || 0}\n`;
    csv += `Total Paid,${data.feeSummary?.totalPaid || 0}\n`;
    csv += `Due Amount,${data.feeSummary?.dueAmount || 0}\n`;
    csv += `Total Installments,${data.feeSummary?.totalInstallments || 0}\n`;
    csv += `Paid Installments,${data.feeSummary?.paidInstallments || 0}\n\n`;

    // Fee Payments
    if (data.fees && data.fees.length > 0) {
      csv += "FEE PAYMENT HISTORY\n";
      csv += "Receipt No,Installment,Amount,Payment Date,Mode\n";
      data.fees.forEach((fee) => {
        csv += `${fee.receiptNumber || "N/A"},${fee.installmentNumber},${
          fee.paidAmount
        },${new Date(fee.paymentDate).toLocaleDateString()},${
          fee.paymentMode
        }\n`;
      });
      csv += "\n";
    }

    // Attendance
    if (data.attendance && data.attendance.length > 0) {
      csv += "ATTENDANCE HISTORY\n";
      csv += "Date,Type,Time,Status,Source\n";
      data.attendance.slice(0, 50).forEach((att) => {
        csv += `${att.date},${att.type},${new Date(
          att.timestamp
        ).toLocaleTimeString()},${att.status},${att.source}\n`;
      });
      csv += "\n";
    }

    // Marks
    if (data.marks && data.marks.length > 0) {
      csv += "MARKS/GRADES\n";
      csv += "Exam Name,Subject,Date,Obtained,Total,Percentage\n";
      data.marks.forEach((mark) => {
        const percentage = (
          (mark.marksObtained / mark.totalMarks) *
          100
        ).toFixed(2);
        csv += `${mark.examName},${mark.subject},${new Date(
          mark.examDate
        ).toLocaleDateString()},${mark.marksObtained},${
          mark.totalMarks
        },${percentage}%\n`;
      });
      csv += "\n";
    }

    // Report metadata
    csv += `\nReport Generated: ${new Date().toLocaleString("en-IN")}\n`;

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${student.studentId}_${student.name}_complete_report.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Report exported successfully!");
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!reportData?.data) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No report data available
        </h3>
      </div>
    );
  }

  const { student, feeSummary, fees, attendance, marks, messAttendance } =
    reportData.data;

  return (
    <div className="space-y-6">
      {/* Export Actions */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-primary-600 mr-2" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Complete Student Report
            </h3>
            <p className="text-sm text-gray-600">
              Generated on {new Date().toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="btn btn-outline btn-sm flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="btn btn-outline btn-sm flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary btn-sm flex items-center"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 print:border-0">
        {/* Student Header */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
              {student.documents?.photo?.url ? (
                <img
                  src={student.documents.photo.url}
                  alt={student.name}
                  className="h-20 w-20 object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-primary-600" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {student.name}
              </h2>
              <p className="text-sm text-gray-600">
                {student.studentId} • {student.class} • {student.batch}
              </p>
              <span
                className={`badge ${
                  student.status === "active"
                    ? "badge-success"
                    : "badge-secondary"
                } mt-2`}
              >
                {student.status}
              </span>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <ReportSection title="Personal Information" icon={<User />}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <ReportField label="Aadhar Number" value={student.aadharNumber} />
            <ReportField label="Blood Group" value={student.bloodGroup} />
            <ReportField
              label="Date of Birth"
              value={new Date(student.dateOfBirth).toLocaleDateString("en-IN")}
            />
            <ReportField label="Gender" value={student.gender} />
            <ReportField label="Phone" value={student.phone} />
            <ReportField label="Email" value={student.email} />
          </div>
        </ReportSection>

        {/* Address */}
        <ReportSection title="Address" icon={<MapPin />}>
          <p className="text-sm text-gray-700">
            {student.address?.street && `${student.address.street}, `}
            {student.address?.city && `${student.address.city}, `}
            {student.address?.state && `${student.address.state} - `}
            {student.address?.pincode}
          </p>
        </ReportSection>

        {/* Parents Information */}
        <ReportSection title="Parents Information" icon={<Phone />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Father</h4>
              <div className="space-y-1">
                <ReportField label="Name" value={student.father?.name} />
                <ReportField label="Phone" value={student.father?.phone} />
                <ReportField
                  label="Email"
                  value={student.father?.email || "N/A"}
                />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Mother</h4>
              <div className="space-y-1">
                <ReportField label="Name" value={student.mother?.name} />
                <ReportField
                  label="Phone"
                  value={student.mother?.phone || "N/A"}
                />
                <ReportField
                  label="Email"
                  value={student.mother?.email || "N/A"}
                />
              </div>
            </div>
          </div>
        </ReportSection>

        {/* Fee Summary */}
        <ReportSection title="Fee Summary" icon={<CreditCard />}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Base Fee</div>
              <div className="text-lg font-bold text-gray-900">
                ₹{feeSummary?.baseFee?.toLocaleString() || 0}
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-xs text-gray-600">Total Paid</div>
              <div className="text-lg font-bold text-green-600">
                ₹{feeSummary?.totalPaid?.toLocaleString() || 0}
              </div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-xs text-gray-600">Due Amount</div>
              <div className="text-lg font-bold text-red-600">
                ₹{feeSummary?.dueAmount?.toLocaleString() || 0}
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-xs text-gray-600">Total Installments</div>
              <div className="text-lg font-bold text-blue-600">
                {feeSummary?.totalInstallments || 0}
              </div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-xs text-gray-600">Paid Installments</div>
              <div className="text-lg font-bold text-purple-600">
                {feeSummary?.paidInstallments || 0}
              </div>
            </div>
          </div>
        </ReportSection>

        {/* Statistics Summary */}
        <ReportSection title="Activity Summary" icon={<Clock />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Fee Payments"
              value={fees?.length || 0}
              color="text-green-600"
            />
            <StatCard
              label="Attendance Records"
              value={attendance?.length || 0}
              color="text-blue-600"
            />
            <StatCard
              label="Exam Results"
              value={marks?.length || 0}
              color="text-purple-600"
            />
            <StatCard
              label="Mess Days"
              value={messAttendance?.length || 0}
              color="text-orange-600"
            />
          </div>
        </ReportSection>

        {/* Recent Fee Payments */}
        {fees && fees.length > 0 && (
          <ReportSection
            title="Recent Fee Payments (Last 5)"
            icon={<CreditCard />}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Receipt
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Mode
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fees.slice(0, 5).map((fee) => (
                    <tr key={fee._id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {fee.receiptNumber || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm font-semibold text-green-600">
                        ₹{fee.paidAmount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {new Date(fee.paymentDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 capitalize">
                        {fee.paymentMode}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>
        )}

        {/* Recent Marks */}
        {marks && marks.length > 0 && (
          <ReportSection
            title="Recent Exam Results (Last 5)"
            icon={<BookOpen />}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Exam
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Subject
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                      Score
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {marks.slice(0, 5).map((mark) => {
                    const percentage = (
                      (mark.marksObtained / mark.totalMarks) *
                      100
                    ).toFixed(2);
                    return (
                      <tr key={mark._id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {mark.examName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {mark.subject}
                        </td>
                        <td className="px-4 py-2 text-sm text-center text-gray-900">
                          {mark.marksObtained}/{mark.totalMarks}
                        </td>
                        <td className="px-4 py-2 text-sm text-center font-semibold text-green-600">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ReportSection>
        )}
      </div>
    </div>
  );
};

// Helper Components
const ReportSection = ({ title, icon, children }) => (
  <div className="mb-6 pb-6 border-b border-gray-200 last:border-b-0">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <span className="text-primary-600 mr-2">{icon}</span>
      {title}
    </h3>
    {children}
  </div>
);

const ReportField = ({ label, value }) => (
  <div>
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value || "N/A"}</div>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className="text-center p-4 bg-gray-50 rounded-lg">
    <div className="text-sm text-gray-600 mb-1">{label}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
  </div>
);

export default CompleteReportTab;
