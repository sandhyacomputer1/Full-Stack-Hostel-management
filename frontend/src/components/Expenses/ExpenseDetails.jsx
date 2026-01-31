// src/components/Expenses/ExpenseDetails.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { expensesAPI } from "../../services/api";
import LoadingSpinner from "../UI/LoadingSpinner";
import {
  Calendar,
  IndianRupee,
  CreditCard,
  User,
  FileText,
  RefreshCw,
  Image as ImageIcon,
  File,
  Download,
  ExternalLink,
} from "lucide-react";

const formatCurrency = (amount) => {
  try {
    const num = Number(amount || 0);
    return num.toLocaleString("en-IN");
  } catch {
    return "0";
  }
};

const ExpenseDetails = ({ id, onClose }) => {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["expense-details", id],
    queryFn: () => expensesAPI.getById(id),
    enabled: !!id,
  });

  // Support both possible shapes: { expense } or { data }
  const expense = data?.data?.expense || data?.data?.data || null;

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-10 text-center space-y-3">
        <p className="text-red-600">Failed to load expense details</p>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => refetch()}
        >
          {isFetching ? (
            <LoadingSpinner size="sm" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Retry
        </button>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="py-10 text-center text-gray-500">
        No expense data found.
      </div>
    );
  }

  // Helper function to get file icon based on type
  const getFileIcon = (type) => {
    if (type === "image") {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Top meta + amount */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Date</p>
            <p className="font-semibold">
              {expense.date ? new Date(expense.date).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-red-100">
            <IndianRupee className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Amount</p>
            <p className="font-semibold text-red-600 text-lg">
              ₹{formatCurrency(expense.amount)}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-100">
            <CreditCard className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Payment Mode</p>
            <p className="font-semibold capitalize">
              {expense.paymentMode?.replace("_", " ") || "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Status:{" "}
              <span
                className={`badge badge-xs ${
                  expense.status === "active"
                    ? "badge-success"
                    : expense.status === "refunded"
                    ? "badge-warning"
                    : expense.status === "cancelled"
                    ? "badge-error"
                    : "badge-ghost"
                }`}
              >
                {expense.status || "—"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Core details */}
      <div className="bg-white border rounded-lg p-4 space-y-4">
        <h4 className="font-semibold text-gray-800 mb-2">
          Expense Information
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Category</p>
            <p className="font-medium capitalize">
              {expense.category?.replace(/_/g, " ") || "—"}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Expense Type</p>
            <p className="font-medium capitalize">
              {expense.type?.replace(/_/g, " ") || "Hostel Expense"}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Vendor</p>
            <p className="font-medium">
              {expense.vendor?.name || "—"}
              {expense.vendor?.phone ? ` (${expense.vendor.phone})` : ""}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Recorded By</p>
            <p className="font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              {expense.recordedBy?.name || "—"}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-gray-500 mb-1">Description</p>
          <p className="text-gray-800 whitespace-pre-wrap">
            {expense.description || "—"}
          </p>
        </div>
      </div>

      {/* Receipts / Attachments - ✅ FIXED */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Receipts & Attachments
            {expense.attachments && expense.attachments.length > 0 && (
              <span className="badge badge-sm badge-primary">
                {expense.attachments.length}
              </span>
            )}
          </h4>
        </div>

        {(!expense.attachments || expense.attachments.length === 0) && (
          <p className="text-sm text-gray-500">No attachments uploaded.</p>
        )}

        {expense.attachments && expense.attachments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expense.attachments.map((attachment) => (
              <div
                key={attachment._id || attachment.url}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image Preview */}
                {attachment.type === "image" && (
                  <div className="relative bg-gray-100 h-40 flex items-center justify-center overflow-hidden">
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* File Info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    {getFileIcon(attachment.type)}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium text-sm truncate"
                        title={attachment.filename}
                      >
                        {attachment.filename || "Attachment"}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {attachment.type || "file"}
                      </p>
                    </div>
                  </div>

                  {/* Upload Date */}
                  {attachment.uploadedAt && (
                    <p className="text-xs text-gray-400">
                      {new Date(attachment.uploadedAt).toLocaleDateString()}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={() => window.open(attachment.url, "_blank")}
                      title="View in new tab"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </button>
                    <a
                      href={attachment.url}
                      download={attachment.filename}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 transition-colors"
                      title="Download file"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ExpenseDetails;
