// src/components/Fees/PaymentEditModal.jsx

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feesAPI } from "../../services/api";
import LoadingSpinner from "../UI/LoadingSpinner";
import {
  X,
  AlertCircle,
  User,
  Hash,
  DollarSign,
  CreditCard,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";

const PaymentEditModal = ({ paymentId, onClose }) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["payment-details-edit", paymentId],
    queryFn: () => feesAPI.getPaymentById(paymentId),
    enabled: !!paymentId,
  });

  // data = axios response -> body = data.data -> fee = data.data.data
  const payment = data?.data?.data;

  const [formState, setFormState] = useState({
    paymentDate: "",
    paymentMode: "cash",
    remarks: "",
    reason: "",
  });

  useEffect(() => {
    if (payment) {
      setFormState({
        paymentDate: payment.paymentDate
          ? new Date(payment.paymentDate).toISOString().slice(0, 10)
          : "",
        paymentMode: payment.paymentMode || "cash",
        remarks: payment.remarks ?? "",
        reason: "",
      });
    }
  }, [payment]);

  const updateMutation = useMutation({
    mutationFn: (payload) => feesAPI.updatePayment(paymentId, payload),
    onSuccess: () => {
      toast.success("Payment updated successfully");
      queryClient.invalidateQueries(["paid-fees"]);
      queryClient.invalidateQueries(["all-payments"]);
      queryClient.invalidateQueries(["payment-details", paymentId]);
      queryClient.invalidateQueries(["payment-details-edit", paymentId]);
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update payment");
    },
  });

  if (!paymentId) return null;

  const handleChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formState.reason.trim()) {
      toast.error("Please provide a reason for change (for audit log)");
      return;
    }

    const payload = {
      paymentDate: formState.paymentDate
        ? new Date(formState.paymentDate)
        : undefined,
      paymentMode: formState.paymentMode || undefined,
      remarks: formState.remarks || undefined,
      reason: formState.reason,
    };

    updateMutation.mutate(payload);
  };

  const formatCurrency = (amount) => {
    try {
      const num = Number(amount);
      return isNaN(num) ? "₹0" : `₹${num.toLocaleString("en-IN")}`;
    } catch {
      return "₹0";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit Payment</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 text-sm">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-6">
              <AlertCircle className="h-10 w-10 text-red-400 mb-2" />
              <p className="text-sm text-gray-600">
                {error?.response?.data?.message || "Failed to load payment"}
              </p>
            </div>
          )}

          {payment && !isLoading && !error && (
            <>
              {/* Locked summary */}
              <div className="bg-gray-50 rounded p-3 text-xs mb-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    Student
                  </span>
                  <span className="font-medium">
                    {payment.student?.studentId} - {payment.student?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center">
                    <Hash className="h-3 w-3 mr-1" />
                    Receipt
                  </span>
                  <span className="font-mono">
                    {payment.receiptNumber || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Installment
                  </span>
                  <span className="font-medium">
                    {payment.installmentNumber
                      ? `Installment ${payment.installmentNumber}`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Amount
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(payment.paidAmount)}
                  </span>
                </div>
              </div>

              {/* Editable: payment date */}
              <div>
                <label className="block text-xs text-gray-500 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Payment Date
                </label>
                <input
                  type="date"
                  className="input mt-1 w-full"
                  value={formState.paymentDate}
                  onChange={(e) => handleChange("paymentDate", e.target.value)}
                />
              </div>

              {/* Editable: payment mode */}
              <div>
                <label className="block text-xs text-gray-500 flex items-center">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Payment Mode
                </label>
                <select
                  className="input mt-1 w-full"
                  value={formState.paymentMode}
                  onChange={(e) => handleChange("paymentMode", e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Editable: remarks */}
              <div>
                <label className="block text-xs text-gray-500">Remarks</label>
                <textarea
                  className="input mt-1 w-full h-20"
                  value={formState.remarks}
                  onChange={(e) => handleChange("remarks", e.target.value)}
                />
              </div>

              {/* Required: reason (for audit log) */}
              <div>
                <label className="block text-xs text-red-500">
                  Reason for change (stored in audit log)
                </label>
                <textarea
                  className="input mt-1 w-full h-16"
                  value={formState.reason}
                  onChange={(e) => handleChange("reason", e.target.value)}
                  placeholder="Example: Updated payment date and mode"
                  required
                />
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline btn-sm"
                  disabled={updateMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={updateMutation.isLoading}
                >
                  {updateMutation.isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default PaymentEditModal;
