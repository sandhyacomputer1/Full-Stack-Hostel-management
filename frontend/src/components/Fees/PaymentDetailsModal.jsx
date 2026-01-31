import React from "react";
import { useQuery } from "@tanstack/react-query";
import { feesAPI } from "../../services/api";
import LoadingSpinner from "../UI/LoadingSpinner";
import {
  X,
  AlertCircle,
  User,
  Hash,
  FileText,
  Phone,
  Calendar,
  CreditCard,
  DollarSign,
} from "lucide-react";

const PaymentDetailsModal = ({ paymentId, onClose }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["payment-details", paymentId],
    queryFn: () => feesAPI.getPaymentById(paymentId),
    enabled: !!paymentId,
  });

  // data = axios response -> body is data.data -> fee is data.data.data
  const payment = data?.data?.data;

  const formatCurrency = (amount) => {
    try {
      const num = Number(amount);
      return isNaN(num) ? "₹0" : `₹${num.toLocaleString("en-IN")}`;
    } catch {
      return "₹0";
    }
  };

  const formatDateFull = (date) => {
    try {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  if (!paymentId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Payment Details
            </h2>
            {payment && (
              <p className="text-xs text-gray-500">
                Receipt #{payment.receiptNumber || "N/A"}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-10">
              <AlertCircle className="h-10 w-10 text-red-400 mb-2" />
              <p className="text-sm text-gray-600">
                {error?.response?.data?.message || "Failed to load details"}
              </p>
            </div>
          )}

          {payment && !isLoading && !error && (
            <div className="space-y-6 text-sm">
              {/* Top summary */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-base font-semibold text-green-600 capitalize">
                    {payment.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Paid Amount</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(payment.paidAmount)}
                  </p>
                </div>
              </div>

              {/* Student information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Student Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start">
                    <User className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-gray-500">Student Name</p>
                      <p className="font-medium text-gray-900">
                        {payment.student?.name || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Hash className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-gray-500">Student ID</p>
                      <p className="font-medium text-gray-900">
                        {payment.student?.studentId || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-gray-500">Class</p>
                      <p className="font-medium text-gray-900">
                        {payment.student?.class || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-gray-500">Batch</p>
                      <p className="font-medium text-gray-900">
                        {payment.student?.batch || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <User className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-gray-500">Father Name</p>
                      <p className="font-medium text-gray-900">
                        {payment.student?.father?.name || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Phone className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-gray-500">Father Phone</p>
                      <p className="font-medium text-gray-900">
                        {payment.student?.father?.phone || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-gray-500">Payment Date</p>
                      <p className="font-medium text-gray-900">
                        {formatDateFull(payment.paymentDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <DollarSign className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-gray-500">Installment</p>
                      <p className="font-medium text-gray-900">
                        {payment.installmentNumber
                          ? `Installment ${payment.installmentNumber}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CreditCard className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-gray-500">Payment Mode</p>
                      <p className="font-medium text-gray-900 capitalize">
                        {payment.paymentMode || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Overdue charges: object with .amount */}
                  {payment.overdueCharges &&
                    Number(payment.overdueCharges.amount) > 0 && (
                      <div className="flex items-start">
                        <DollarSign className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-gray-500">
                            {payment.overdueCharges.title || "Overdue Charges"}
                          </p>
                          <p className="font-medium text-red-600">
                            {formatCurrency(payment.overdueCharges.amount)}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Other charges: array */}
                  {Array.isArray(payment.otherCharges) &&
                    payment.otherCharges.length > 0 && (
                      <div className="flex items-start md:col-span-2">
                        <DollarSign className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                        <div className="w-full">
                          <p className="text-gray-500 mb-1">Other Charges</p>
                          <div className="space-y-1">
                            {payment.otherCharges.map((c, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between text-xs bg-gray-50 rounded px-2 py-1"
                              >
                                <span>{c.title || `Charge ${idx + 1}`}</span>
                                <span className="font-medium">
                                  {formatCurrency(c.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* Remarks */}
                <div className="mt-3">
                  <p className="text-gray-500 mb-1">Remarks</p>
                  <p className="text-gray-900">
                    {payment.remarks?.trim()
                      ? payment.remarks
                      : "No remarks added."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex justify-end">
          <button onClick={onClose} className="btn btn-outline btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsModal;
