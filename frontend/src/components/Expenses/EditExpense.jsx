// src/components/Expenses/EditExpense.jsx
import React, { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { expensesAPI } from "../../services/api";
import toast from "react-hot-toast";
import {
  X,
  Loader2,
  Save,
  Eye,
  Trash2,
  FileText,
  Building2,
  Receipt,
  IndianRupee,
  DollarSign,
  CreditCard,
  Calendar,
  FilterIcon,
  Phone,
  MapPin,
  Plus,
  Download,
} from "lucide-react";

const Field = ({ label, icon: Icon, children }) => (
  <div className="flex flex-col gap-1">
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      {Icon && <Icon className="h-4 w-4 text-gray-400" />}
      {label}
    </label>
    {children}
  </div>
);

const EditExpense = ({ id, onClose }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      type: "hostel_expense",
      amount: "",
      description: "",
      paymentMode: "cash",
      transactionId: "",
      date: "",
      category: "",
      vendor: {
        name: "",
        contact: "",
        address: "",
      },
      billNumber: "",
      status: "active",
      attachments: [],
      newFiles: [],
    },
  });

  const watchAttachments = watch("attachments", []);
  const watchNewFiles = watch("newFiles", []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["expense", id],
    queryFn: async () => await expensesAPI.getById(id),
    enabled: !!id,
  });

  // Adjust according to your backend response shape
  const expense = data?.data?.expense || data?.data?.data || null;

  useEffect(() => {
    if (expense) {
      reset({
        type: expense.type || "hostel_expense",
        amount: expense.amount || "",
        description: expense.description || "",
        paymentMode: expense.paymentMode || "cash",
        transactionId: expense.transactionId || "",
        date: expense.date ? expense.date.split("T")[0] : "",
        category: expense.category || "",
        vendor: {
          name: expense.vendor?.name || "",
          contact: expense.vendor?.contact || expense.vendor?.phone || "",
          address: expense.vendor?.address || "",
        },
        billNumber: expense.billNumber || "",
        status: expense.status || "active",
        attachments: expense.attachments || expense.receipts || [],
        newFiles: [],
      });
    }
  }, [expense, reset]);

  const mutation = useMutation({
    mutationFn: async (formData) => {
      const payload = new FormData();

      // Scalar & nested fields except attachments/newFiles
      Object.keys(formData).forEach((key) => {
        if (key === "newFiles" || key === "attachments") return;

        const value = formData[key];

        if (typeof value === "object" && value !== null) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (subValue !== undefined && subValue !== null) {
              payload.append(`${key}[${subKey}]`, subValue);
            }
          });
        } else if (value !== undefined && value !== null) {
          payload.append(key, value);
        }
      });

      // Existing attachments (keep after removals)
      payload.append("attachments", JSON.stringify(formData.attachments || []));

      // New files
      formData.newFiles?.forEach((fileObj) => {
        if (fileObj?.file) {
          payload.append("newFiles", fileObj.file);
        }
      });

      return await expensesAPI.update(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense", id] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-summary"] });
      toast.success("Expense updated successfully!");
      onClose && onClose();
    },
    onError: (err) => {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update expense!");
    },
  });

  const onSubmit = (form) => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    mutation.mutate(form);
  };

  const renderPreview = (file) => {
    if (!file) return null;

    const isImage =
      file.url?.match(/\.(jpg|jpeg|png|webp)$/i) ||
      file.file?.type?.startsWith("image");

    if (isImage) {
      const src = file.url || URL.createObjectURL(file.file);
      return (
        <img
          src={src}
          className="h-40 w-full object-cover rounded-xl"
          alt="preview"
        />
      );
    }

    return (
      <div className="h-40 flex items-center justify-center bg-gray-200 rounded-xl">
        <FileText size={40} className="text-gray-600" />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !expense) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-gray-50">
        <p className="text-red-600">Failed to load expense for editing.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Edit Expense</h3>
              <p className="text-xs text-gray-600 mt-1">Update expense details below</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-4 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form
            id="editForm"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* BASIC INFO */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <IndianRupee className="text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-800">
                  Basic Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Expense Type" icon={Receipt}>
                  <select
                    {...register("type")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled
                  >
                    <option value="hostel_expense">Hostel Expense</option>
                  </select>
                </Field>

                <Field label="Amount (₹)">
                  <input
                    type="number"
                    {...register("amount")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Field>

                <Field label="Description">
                  <input
                    type="text"
                    {...register("description")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Field>

                <Field label="Payment Mode">
                  <select
                    {...register("paymentMode")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[
                      "cash",
                      "card",
                      "upi",
                      "bank_transfer",
                      "cheque",
                      "online",
                    ].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Transaction ID">
                  <input
                    type="text"
                    {...register("transactionId")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Field>

                <Field label="Date">
                  <input
                    type="date"
                    {...register("date")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Field>

                <Field label="Status">
                  <select
                    {...register("status")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">active</option>
                    <option value="refunded">refunded</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </Field>
              </div>
            </section>

            {/* HOSTEL FIELDS */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="text-purple-600" />
                <h2 className="text-sm font-semibold text-gray-800">
                  Vendor Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    {...register("category")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[
                      "food_groceries",
                      "maintenance",
                      "utilities",
                      "salary",
                      "rent",
                      "equipment",
                      "cleaning",
                      "security",
                      "medical",
                      "transportation",
                      "office_supplies",
                      "marketing",
                      "legal",
                      "insurance",
                      "other",
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Vendor Name">
                  <input
                    type="text"
                    {...register("vendor.name")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </Field>

                <Field label="Vendor Contact">
                  <input
                    type="text"
                    {...register("vendor.contact")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </Field>

                <Field label="Vendor Address">
                  <input
                    type="text"
                    {...register("vendor.address")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </Field>

                <Field label="Bill Number">
                  <input
                    type="text"
                    {...register("billNumber")}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </Field>
              </div>
            </section>

            {/* ATTACHMENTS */}
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <Receipt className="text-orange-600" />
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                  Receipts & Attachments
                </h2>
              </div>

              {/* Existing attachments */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {watchAttachments?.length > 0 ? (
                  watchAttachments.map((file, idx) => (
                    <div
                      key={file.publicId || file._id || file.url || idx}
                      className="border border-gray-200 rounded-xl p-4 space-y-3"
                    >
                      {renderPreview(file)}

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="truncate max-w-[150px]">
                          {file.filename || file.originalName || "Attachment"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = watchAttachments.filter(
                              (_, i) => i !== idx
                            );
                            setValue("attachments", updated, {
                              shouldDirty: true,
                            });
                          }}
                          className="text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No existing receipts.</p>
                )}
              </div>

              {/* New files */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="text-blue-500" size={18} />
                  <span className="text-sm font-medium text-gray-700">
                    Add New Receipts
                  </span>
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).map(
                      (file) => ({ file })
                    );
                    setValue("newFiles", files, { shouldDirty: true });
                  }}
                  className="border border-gray-300 p-2.5 rounded-lg text-sm"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {watchNewFiles?.map((fileObj, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-xl p-4 space-y-3"
                    >
                      {renderPreview(fileObj)}

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="truncate max-w-[150px]">
                          {fileObj.file?.name || "New file"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = watchNewFiles.filter(
                              (_, i) => i !== idx
                            );
                            setValue("newFiles", updated, {
                              shouldDirty: true,
                            });
                          }}
                          className="text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-2">
            
            <button
              type="submit"
              form="editForm"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md"
              disabled={mutation.isLoading || isSubmitting}
            >
              {mutation.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditExpense;
