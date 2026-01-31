import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { feesAPI } from "../../services/api";
import toast from "react-hot-toast";
import { ArrowLeft, Calculator, CreditCard, Plus, X } from "lucide-react";

const FeePayment = () => {
  const { studentId } = useParams();
  console.log("Route studentId param:", studentId);
  const navigate = useNavigate();
  const item = useLocation()?.state?.item;

  if (!item) {
    return (
      <p className="text-center text-red-600 font-semibold mt-10">
        Missing installment data
      </p>
    );
  }

  const today = new Date();

  const { register, handleSubmit } = useForm({
    defaultValues: {
      paymentMode: "cash",
      paymentDay: today.getDate(),
      paymentMonth: today.getMonth() + 1,
      paymentYear: today.getFullYear(),
      remarks: "",
    },
  });

  // ===========================
  // FEE STATE
  // ===========================
  const [installmentAmount, setInstallmentAmount] = useState(
    Number(item.installment.amount || 0)
  );
  const [lateFee, setLateFee] = useState(0);
  const [otherCharges, setOtherCharges] = useState([]);

  const addCharge = () => {
    setOtherCharges([...otherCharges, { title: "", amount: 0 }]);
  };

  const updateCharge = (index, field, value) => {
    const updated = [...otherCharges];
    if (field === "amount") {
      updated[index][field] = Number(value || 0);
    } else {
      updated[index][field] = value;
    }
    setOtherCharges(updated);
  };

  const removeCharge = (index) => {
    setOtherCharges(otherCharges.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const others = otherCharges.reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0
    );
    return Number(installmentAmount || 0) + Number(lateFee || 0) + others;
  };

  // ===========================
  // SUBMIT API
  // ===========================
  const recordPayment = useMutation({
    mutationFn: feesAPI.recordPayment,
    onSuccess: (res) => {
      console.log("recordPayment success:", res.data);
      const feeId = res.data?.data?._id;
      if (!feeId) {
        console.error("No feeId in response:", res.data);
        toast.error("Payment recorded but no receipt ID returned");
        return;
      }
      toast.success("Payment Recorded Successfully");
      navigate(`/fees/receipt/${feeId}`);
    },
    onError: (err) => {
      console.log("recordPayment error:", err?.response?.data);
      toast.error(err?.response?.data?.message || "Payment failed");
    },
  });

  const onSubmit = (form) => {
    const paymentDate = new Date(
      form.paymentYear,
      form.paymentMonth - 1,
      form.paymentDay
    );

    const payload = {
      // MUST match backend validators
      studentId: item.studentObjectId, // backend expects studentId
      installmentType: item.installment.installmentType || "installment",
      installmentNumber: Number(item.installment.installmentNumber), // ensure int
      installmentAmount: Number(installmentAmount),

      overdueCharges: {
        title: "Late Fee",
        amount: Number(lateFee || 0),
      },

      otherCharges: otherCharges
        .filter((c) => c.title && Number(c.amount) > 0)
        .map((c) => ({
          title: c.title,
          amount: Number(c.amount),
        })),

      paidAmount: Number(calculateTotal()), // ensure float
      paymentMode: form.paymentMode, // cash / upi / card / bank_transfer
      paymentDate,
      remarks: form.remarks,
    };

    console.log("Final Payload:", payload);
    recordPayment.mutate(payload);
  };

  // ===========================
  // UI
  // ===========================
  return (
    <div className="p-6 space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/fees")}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>

        <div>
          <h1 className="text-2xl font-bold">Record Payment</h1>
          <p className="text-gray-500 text-sm">
            {item.name} • {item.studentId} • Class {item.class}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT FORM */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="lg:col-span-2 space-y-6 bg-white p-6 rounded-xl shadow-md border"
        >
          {/* PAYMENT DATE CARD */}
          <div className="bg-gray-50 border rounded-xl p-5">
            <h3 className="text-lg font-semibold">Payment Date</h3>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <input
                type="number"
                min="1"
                max="31"
                {...register("paymentDay")}
                className="input"
              />
              <select {...register("paymentMonth")} className="input">
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={i + 1}>
                    {new Date(0, i).toLocaleString("en", { month: "long" })}
                  </option>
                ))}
              </select>
              <select {...register("paymentYear")} className="input">
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PAYMENT MODE */}
          <div>
            <h3 className="text-lg font-semibold">Payment Mode</h3>
            <select {...register("paymentMode")} className="input mt-3">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          {/* FEE BREAKDOWN */}
          <div>
            <h3 className="text-lg font-semibold">Fee Breakdown</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm text-gray-600">Base Fee</label>
                <input
                  type="number"
                  value={installmentAmount}
                  onChange={(e) =>
                    setInstallmentAmount(Number(e.target.value || 0))
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Late Fee</label>
                <input
                  type="number"
                  placeholder="Enter late fee"
                  value={lateFee}
                  onChange={(e) => setLateFee(Number(e.target.value || 0))}
                  className="input"
                />
              </div>
            </div>

            {/* OTHER CHARGES */}
            <div className="mt-5">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Other Charges</h4>
                <button
                  type="button"
                  onClick={addCharge}
                  className="flex items-center gap-1 text-blue-600 text-sm"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
              {otherCharges.map((c, i) => (
                <div
                  key={i}
                  className="flex gap-2 mt-3 bg-gray-50 p-3 rounded-lg border"
                >
                  <input
                    type="text"
                    placeholder="Title"
                    className="input flex-1"
                    value={c.title}
                    onChange={(e) => updateCharge(i, "title", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    className="input w-32"
                    value={c.amount}
                    onChange={(e) => updateCharge(i, "amount", e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-red-500"
                    onClick={() => removeCharge(i)}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* REMARKS */}
          <div>
            <h3 className="text-lg font-semibold">Remarks</h3>
            <textarea
              {...register("remarks")}
              className="input mt-2 h-20"
              placeholder="Write notes here..."
            />
          </div>

          {/* SUBMIT */}
          <button className="btn btn-primary mt-5 p-4 w-full flex items-center justify-center gap-2">
            <CreditCard size={18} /> Record Payment
          </button>
        </form>

        {/* RIGHT SUMMARY */}
        <div className="bg-white p-6 rounded-xl shadow-md border space-y-4 flex flex-col justify-center">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="text-blue-600" /> Summary
          </h3>
          <div className="space-y-2">
            <p className="flex justify-between">
              <span>Base Fee</span>
              <b>₹{installmentAmount}</b>
            </p>
            <p className="flex justify-between">
              <span>Late Fee</span>
              <b>₹{lateFee}</b>
            </p>
            {otherCharges.map(
              (c, i) =>
                c.amount > 0 && (
                  <p key={i} className="flex justify-between">
                    <span>{c.title}</span>
                    <b>₹{c.amount}</b>
                  </p>
                )
            )}
            <hr />
            <p className="flex justify-between text-xl font-bold text-green-700">
              <span>Total</span>
              <span>₹{calculateTotal()}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeePayment;
