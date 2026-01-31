import React from "react";
import { AlertTriangle, X } from "lucide-react";

const DeletePaymentModal = ({
  isOpen,
  payment,
  reason,
  setReason,
  onCancel,
  onConfirm,
  loading,
}) => {
  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            Delete Payment
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-gray-100"
            disabled={loading}
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3 text-sm">
          <p className="text-gray-700">
            Are you sure you want to delete this payment record?
          </p>
          <p className="text-xs text-gray-500">
            This action cannot be undone. An audit log entry will be created
            with your reason.
          </p>

          {/* Summary box */}
          <div className="bg-gray-50 rounded p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Student</span>
              <span className="font-medium">
                {payment.studentId} - {payment.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-medium">₹{payment.paidAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Receipt</span>
              <span className="font-mono">
                {payment.receiptNumber || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Date</span>
              <span className="font-medium">
                {payment.paymentDate
                  ? new Date(payment.paymentDate).toLocaleDateString("en-IN")
                  : "N/A"}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs text-red-500">
              Reason for deletion (required)
            </label>
            <textarea
              className="input mt-1 w-full h-20"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Example: Duplicate entry / wrong student / test data"
              disabled={loading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="btn btn-outline btn-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger btn-sm"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletePaymentModal;
