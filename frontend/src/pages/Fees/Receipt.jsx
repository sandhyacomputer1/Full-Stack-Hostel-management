// src/pages/Fees/Receipt.jsx (path as per your project)
import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { feesAPI } from "../../services/api";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import html2canvas from "html2canvas";

const Receipt = () => {
  const navigate = useNavigate();

  // Safe param extraction
  const params = useParams();
  const feeId = params.feeId || params.id || params.receiptId;

  if (!feeId) {
    return (
      <div className="p-4 text-red-600 font-bold">
        ❌ Invalid Receipt URL — feeId is missing!
      </div>
    );
  }

  const receiptRef = useRef(null);

  const handlePrint = async () => {
    if (!receiptRef.current) return;

    const element = receiptRef.current;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");

    const printArea = document.createElement("div");
    printArea.style.position = "fixed";
    printArea.style.top = "0";
    printArea.style.left = "0";
    printArea.style.width = "100%";
    printArea.style.height = "100%";
    printArea.style.background = "#ffffff";
    printArea.style.display = "flex";
    printArea.style.justifyContent = "center";
    printArea.style.alignItems = "center";
    printArea.style.padding = "20px";
    printArea.style.zIndex = "9999";

    const img = document.createElement("img");
    img.src = imgData;
    // Wider for print (previously 75mm)
    img.style.maxWidth = "180mm";
    img.style.height = "auto";
    img.style.objectFit = "contain";

    printArea.appendChild(img);
    document.body.appendChild(printArea);

    setTimeout(() => {
      window.print();
      document.body.removeChild(printArea);
    }, 300);
  };

  const {
    data: receiptData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["receipt", feeId],
    queryFn: async () => (await feesAPI.generateReceipt(feeId)).data,
    enabled: !!feeId,
    onError: (err) => toast.error(err.message || "Failed to fetch receipt"),
  });

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "-";

  const formatAmount = (amt) => Number(amt || 0).toLocaleString("en-IN");

  if (isLoading) return <p>Loading receipt...</p>;
  if (error) return <p>Error loading receipt!</p>;
  if (!receiptData?.receipt) return <p>No receipt data found!</p>;

  const feeRecord = receiptData.receipt.feeRecord;
  const totalOtherCharges =
    feeRecord.otherCharges?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

  const totalAmount =
    Number(feeRecord.installmentAmount || 0) +
    Number(feeRecord.overdueCharges?.amount || 0) +
    totalOtherCharges;

  const studentAddress = [
    feeRecord.student?.address?.street,
    feeRecord.student?.address?.city,
    feeRecord.student?.address?.state,
    feeRecord.student?.address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="px-4 py-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
        <div className="flex items-start">
          <button
            onClick={() => navigate("/fees")}
            className="inline-flex items-center p-2 text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg mr-3 border border-transparent hover:border-gray-200 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fee Receipt</h1>
            <p className="mt-1 text-sm text-gray-600">
              Printable receipt for student payment
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          Print
        </button>
      </div>

      {/* Printable Area */}
      <div
        ref={receiptRef}
        className="max-w-[900px] mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none"
      >
        {/* Header */}
        <div className="h-10 bg-gradient-to-r from-indigo-700 to-indigo-900" />
        <header className="px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">
                {feeRecord.assignedHostel?.name || "Hostel Name"}
              </h2>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  {feeRecord.assignedHostel?.address || "Hostel address not set"}
                </p>
                {feeRecord.assignedHostel?.phone && (
                  <p className="text-sm text-gray-600">
                    Phone: {feeRecord.assignedHostel.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xl font-extrabold tracking-tight text-gray-900">
                RECEIPT
              </p>
              <div className="mt-2 inline-block rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Receipt No:</span>{" "}
                  {feeRecord.receiptNumber || "-"}
                </p>
                <p>
                  <span className="font-semibold">Date:</span>{" "}
                  {formatDate(feeRecord.paymentDate)}
                </p>
                <p>
                  <span className="font-semibold">Status:</span>{" "}
                  <span className="capitalize">{feeRecord.status || "paid"}</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-8">
          <div className="h-px bg-gray-200" />
        </div>

        {/* Student Info */}
        <section className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 tracking-wide">
                Bill To
              </h3>
              <div className="mt-3 text-sm text-gray-700 space-y-1">
                <p className="text-base font-extrabold text-gray-900">
                  {feeRecord.student?.name || "-"}
                </p>
                <p>
                  <span className="font-semibold">Student ID:</span>{" "}
                  {feeRecord.student?.studentId || "-"}
                </p>
                <p>
                  <span className="font-semibold">Class:</span>{" "}
                  {feeRecord.student?.class || "-"}
                </p>
                <p>
                  <span className="font-semibold">Batch:</span>{" "}
                  {feeRecord.student?.batch || "-"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 tracking-wide">
                Contact Information
              </h3>
              <div className="mt-3 text-sm text-gray-700 space-y-1">
                <p>
                  <span className="font-semibold">Father:</span>{" "}
                  {feeRecord.student?.father?.name || "-"}
                </p>
                <p>
                  <span className="font-semibold">Phone:</span>{" "}
                  {feeRecord.student?.phone || "-"}
                </p>
                <p>
                  <span className="font-semibold">Address:</span>{" "}
                  {studentAddress || "-"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Info */}
        <section className="px-8 pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-wide">
                Payment Details
              </h3>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Installment No:</span>{" "}
                  {feeRecord.installmentNumber || "-"}
                </p>
                <p>
                  <span className="font-semibold">Payment Mode:</span>{" "}
                  {feeRecord.paymentMode || "-"}
                </p>
                <p>
                  <span className="font-semibold">Collected By:</span>{" "}
                  {feeRecord.collectedBy?.name || "-"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
              <p className="text-xs font-semibold tracking-widest text-gray-600">
                TOTAL RECEIVED
              </p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900 tracking-tight">
                ₹{formatAmount(totalAmount)}
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900 tracking-wider">
                    Item Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-indigo-900 tracking-wider">
                    Amount (₹)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-gray-800">Installment Fee</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatAmount(feeRecord.installmentAmount)}
                  </td>
                </tr>

                {feeRecord.overdueCharges?.amount > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-gray-800">
                      {feeRecord.overdueCharges?.title || "Overdue Charges"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatAmount(feeRecord.overdueCharges?.amount)}
                    </td>
                  </tr>
                )}

                {feeRecord.otherCharges
                  ?.filter((c) => c.amount > 0)
                  .map((c, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-gray-800">{c.title}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatAmount(c.amount)}
                      </td>
                    </tr>
                  ))}

                <tr className="bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900">Total</td>
                  <td className="px-4 py-3 text-right font-extrabold text-gray-900">
                    ₹{formatAmount(totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {feeRecord.remarks && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Remarks:</span> {feeRecord.remarks}
              </p>
            </div>
          )}
        </section>

        {/* Footer / Signatures */}
        <section className="px-8 pt-6 pb-8">
          <div className="h-px bg-gray-200" />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-10 text-sm text-gray-700">
            <div>
              <p className="font-semibold">Terms</p>
              <p className="mt-2 text-sm text-gray-600">
                This receipt confirms that the above payment has been received.
                Please keep it for your records.
              </p>
            </div>

            <div className="md:text-right">
              <p className="font-semibold">Authorized Signatory</p>
              <p className="mt-2 text-sm text-gray-600">
                {feeRecord.collectedBy?.name || "-"}
              </p>
              <div className="mt-8 h-px w-44 bg-gray-400 md:ml-auto" />
            </div>
          </div>

          <p className="mt-8 text-xs text-gray-500 text-center">
            This is a computer generated receipt and does not require a physical
            seal.
          </p>
        </section>

        <div className="h-8 bg-gradient-to-r from-indigo-900 to-indigo-700" />
      </div>
    </div>
  );
};

export default Receipt;
