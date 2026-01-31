import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  Eye,
  Edit,
  Trash2,
  PrinterCheck,
  Receipt,
  AlertCircle,
  MessageSquare,
  Send,
} from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";
import SmsSendButton from "../Fees/SmsSendButton";
import { feesAPI } from "../../services/api";

const FeesTab = ({ paidFeesData, unpaidFeesData, isLoading, studentId }) => {
  const [activeView, setActiveView] = useState("paid"); // 'paid' or 'unpaid'

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const paidFees = paidFeesData?.data?.paidPaymentData || [];
  const unpaidFees = unpaidFeesData?.data?.unpaidFees || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Paid"
          value={`₹${paidFees
            .reduce((sum, f) => sum + (f.paidAmount || 0), 0)
            .toLocaleString()}`}
          color="bg-green-100 text-green-600"
        />
        <SummaryCard
          label="Total Due"
          value={`₹${unpaidFees
            .reduce((sum, f) => sum + (f.dueAmount || 0), 0)
            .toLocaleString()}`}
          color="bg-red-100 text-red-600"
        />
        <SummaryCard
          label="Pending Installments"
          value={unpaidFees.length}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveView("paid")}
          className={`px-4 py-2 font-medium transition-colors ${activeView === "paid"
            ? "text-primary-600 border-b-2 border-primary-600"
            : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Paid Fees ({paidFees.length})
        </button>
        <button
          onClick={() => setActiveView("unpaid")}
          className={`px-4 py-2 font-medium transition-colors ${activeView === "unpaid"
            ? "text-primary-600 border-b-2 border-primary-600"
            : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Unpaid/Overdue ({unpaidFees.length})
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {activeView === "paid" ? "Paid Fee Payments" : "Unpaid/Overdue Fees"}
        </h3>
        {activeView === "paid" && (
          <button className="btn btn-primary btn-sm flex items-center space-x-1">
            <CreditCard className="h-4 w-4" />
            <span>Record Payment</span>
          </button>
        )}
      </div>

      {/* Paid Fees Table */}
      {activeView === "paid" && (
        <>
          {paidFees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 divide-y divide-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Receipt
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Installment
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Payment Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Mode
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      Print
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      SMS
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paidFees.map((fee) => (
                    <tr
                      key={fee._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {fee.receiptNumber || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-green-600">
                          ₹{fee.paidAmount?.toLocaleString() || 0}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        Installment {fee.installmentNumber}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(fee.paymentDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {fee.paymentMode || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/fees/receipt/${fee._id}`}
                          className="inline-flex items-center justify-center p-2 text-gray-800 hover:text-green-600 hover:bg-green-50 rounded"
                        >
                          <PrinterCheck className="h-4 w-4" />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <SmsSendButton
                          onSend={() => feesAPI.resendPaymentConfirmation(fee._id)}
                          label="Resend SMS"
                          variant="success"
                          icon="send"
                          successMessage="Payment confirmation SMS sent"
                          errorMessage="Failed to send SMS"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Link className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Receipt />}
              title="No paid fees"
              description="Paid fee records will appear here."
            />
          )}
        </>
      )}

      {/* Unpaid Fees Table */}
      {activeView === "unpaid" && (
        <>
          {unpaidFees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 divide-y divide-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Installment
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Due Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Overdue Charges
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unpaidFees.map((fee) => (
                    <tr
                      key={fee._id}
                      className={`hover:bg-gray-50 transition-colors ${fee.status === "overdue" ? "bg-red-50" : ""
                        }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          Installment {fee.installmentNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-red-600">
                          ₹{fee.dueAmount?.toLocaleString() || 0}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(fee.dueDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${fee.status === "overdue"
                            ? "badge-danger"
                            : "badge-warning"
                            }`}
                        >
                          {fee.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-orange-600 font-medium">
                        ₹{fee.overdueCharges?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {fee.status === "overdue" ? (
                            <SmsSendButton
                              onSend={() => feesAPI.sendOverdueAlert(studentId)}
                              label="Send Alert"
                              variant="danger"
                              icon="alert"
                              successMessage="Overdue alert sent"
                              errorMessage="Failed to send alert"
                            />
                          ) : (
                            <SmsSendButton
                              onSend={() => feesAPI.sendDueReminder(studentId)}
                              label="Send Reminder"
                              variant="primary"
                              icon="message"
                              successMessage="Due reminder sent"
                              errorMessage="Failed to send reminder"
                            />
                          )}
                          <Link
                            to={`/fees/record-payment?studentId=${fee.studentObjectId}&installment=${fee.installmentNumber}`}
                            className="btn btn-sm btn-primary"
                          >
                            Pay Now
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<AlertCircle />}
              title="No unpaid fees"
              description="All fees are paid!"
            />
          )}
        </>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
    <div className="text-sm text-gray-600 mb-1">{label}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
  </div>
);

const EmptyState = ({ icon, title, description }) => (
  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
    {React.cloneElement(icon, { className: "mx-auto h-12 w-12 text-gray-400" })}
    <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>
);

export default FeesTab;
