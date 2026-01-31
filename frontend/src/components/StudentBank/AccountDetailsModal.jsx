// src/components/StudentBank/AccountDetailsModal.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { studentBankAPI } from "../../services/api";
import {
  X,
  Lock,
  Unlock,
  History,
  RefreshCw,
  Plus,
  Minus,
  User,
  Wallet,
  Calendar,
  AlertCircle,
} from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";
import TransactionTable from "./TransactionTable";
import DepositModal from "./DepositModal";
import DebitModal from "./DebitModal";
import Swal from "sweetalert2";

const AccountDetailsModal = ({ account, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [freezeReason, setFreezeReason] = useState("");

  useEffect(() => {
    if (account) {
      fetchTransactions();
    }
  }, [account]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await studentBankAPI.getTransactions(
        account.student._id,
        {
          limit: 10,
        }
      );
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFreezeToggle = async () => {
    if (account.status === "active" && !freezeReason.trim()) {
      toast.error("Please provide a reason for freezing the account");
      return;
    }

    const result = await Swal.fire({
      title:
        account.status === "active" ? "Freeze Account?" : "Unfreeze Account?",
      html:
        account.status === "active"
          ? `<p>Are you sure you want to freeze <strong>${account.student.name}</strong>'s account?</p>
             <p class="text-sm text-gray-600 mt-2">Reason: ${freezeReason}</p>`
          : `<p>Are you sure you want to unfreeze <strong>${account.student.name}</strong>'s account?</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText:
        account.status === "active" ? "Yes, Freeze" : "Yes, Unfreeze",
      confirmButtonColor: account.status === "active" ? "#f59e0b" : "#10b981",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      await studentBankAPI.freezeAccount(account.student._id, {
        freeze: account.status === "active",
        reason: freezeReason || undefined,
      });

      toast.success(
        `Account ${
          account.status === "active" ? "frozen" : "unfrozen"
        } successfully`
      );
      setShowFreezeDialog(false);
      setFreezeReason("");
      onUpdate && onUpdate();
    } catch (error) {
      console.error("Failed to update account status:", error);
      // 403 will already be toasted by interceptor; this is fallback
      if (error.response?.status !== 403) {
        toast.error("Failed to update account status");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    try {
      setLoading(true);
      const response = await studentBankAPI.reconcileBalance(
        account.student._id
      );

      if (response.data.reconciliation.isMatching) {
        Swal.fire({
          icon: "success",
          title: "Balance Verified",
          text: "All transactions match correctly!",
          timer: 2000,
        });
      } else {
        Swal.fire({
          icon: "warning",
          title: "Mismatch Detected",
          html: `
            <p>Difference: <strong>₹${response.data.reconciliation.difference.toFixed(
              2
            )}</strong></p>
            <p class="text-sm text-gray-600 mt-2">Please review transactions</p>
          `,
        });
      }
    } catch (error) {
      console.error("Reconciliation failed:", error);
      toast.error("Failed to reconcile balance");
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSuccess = () => {
    fetchTransactions();
    onUpdate && onUpdate();
    setShowDepositModal(false);
    setShowDebitModal(false);
  };

  if (!account) return null;

  const getStatusConfig = (status) => {
    const configs = {
      active: {
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
      },
      frozen: {
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
      },
      closed: {
        color: "text-gray-600",
        bg: "bg-gray-50",
        border: "border-gray-200",
      },
    };
    return configs[status] || configs.active;
  };

  const statusConfig = getStatusConfig(account.status);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  <User className="h-6 w-6 mr-2" />
                  {account.student.name}
                </h2>
                <p className="text-primary-100 mt-1">
                  {account.student.studentId} | Class {account.student.class} |
                  Batch {account.student.batch}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Balance & Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Balance Card */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium flex items-center">
                      <Wallet className="h-4 w-4 mr-1" />
                      Current Balance
                    </p>
                    <p className="text-4xl font-bold text-green-900 mt-2">
                      ₹{account.balance?.toFixed(2) || "0.00"}
                    </p>
                    {account.lastTransactionAt && (
                      <p className="text-xs text-green-600 mt-2 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Last:{" "}
                        {new Date(account.lastTransactionAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Card */}
              <div
                className={`border rounded-lg p-6 ${statusConfig.bg} ${statusConfig.border}`}
              >
                <p className="text-sm font-medium text-gray-700">
                  Account Status
                </p>
                <p
                  className={`text-2xl font-bold mt-2 ${statusConfig.color} uppercase`}
                >
                  {account.status}
                </p>
                {account.freezeReason && (
                  <div className="mt-3 flex items-start">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                    <p className="text-sm text-gray-600">
                      <strong>Reason:</strong> {account.freezeReason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowDepositModal(true)}
                disabled={account.status !== "active"}
                className="btn btn-success btn-md flex items-center disabled:opacity-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Deposit
              </button>

              <button
                onClick={() => setShowDebitModal(true)}
                disabled={account.status !== "active"}
                className="btn btn-danger btn-md flex items-center disabled:opacity-50"
              >
                <Minus className="h-4 w-4 mr-2" />
                Debit
              </button>

              <button
                onClick={() => setShowFreezeDialog(!showFreezeDialog)}
                className={`btn btn-md flex items-center ${
                  account.status === "active"
                    ? "btn-warning"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {account.status === "active" ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Freeze Account
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Unfreeze Account
                  </>
                )}
              </button>

              <button
                onClick={handleReconcile}
                disabled={loading}
                className="btn btn-outline btn-md flex items-center disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Reconcile
              </button>
            </div>

            {/* Freeze Dialog - Freeze */}
            {showFreezeDialog && account.status === "active" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Reason for freezing (required)
                </label>
                <textarea
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  rows="2"
                  placeholder="Enter reason..."
                  className="input mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleFreezeToggle}
                    disabled={!freezeReason.trim() || loading}
                    className="btn btn-warning btn-sm disabled:opacity-50"
                  >
                    Confirm Freeze
                  </button>
                  <button
                    onClick={() => {
                      setShowFreezeDialog(false);
                      setFreezeReason("");
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Freeze Dialog - Unfreeze */}
            {showFreezeDialog && account.status === "frozen" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-3">
                  Are you sure you want to unfreeze this account?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleFreezeToggle}
                    disabled={loading}
                    className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Confirm Unfreeze
                  </button>
                  <button
                    onClick={() => setShowFreezeDialog(false)}
                    className="btn btn-outline btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  Recent Transactions (Last 10)
                </h3>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : transactions.length > 0 ? (
                <TransactionTable transactions={transactions} />
              ) : (
                <div className="text-center py-12">
                  <History className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-gray-500 mt-2">No transactions found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nested Modals */}
      {showDepositModal && (
        <DepositModal
          onClose={() => setShowDepositModal(false)}
          onSuccess={handleTransactionSuccess}
          preSelectedStudent={account.student}
        />
      )}

      {showDebitModal && (
        <DebitModal
          onClose={() => setShowDebitModal(false)}
          onSuccess={handleTransactionSuccess}
          preSelectedStudent={account.student}
        />
      )}
    </>
  );
};

export default AccountDetailsModal;
