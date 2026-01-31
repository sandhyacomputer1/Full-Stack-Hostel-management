// src/components/StudentBank/DepositModal.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { studentBankAPI, studentsAPI } from "../../services/api";
import { X, DollarSign, Users } from "lucide-react";
import { CREDIT_CATEGORIES } from "../../constants/bankConstants";

const DepositModal = ({ onClose, onSuccess, preSelectedStudent = null }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        studentId: preSelectedStudent?._id || "",
        amount: "",
        category: "cash_deposit",
        remarks: "",
        referenceId: "",
    });

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            // Remove status parameter - backend doesn't support it
            const response = await studentsAPI.getAll({ limit: 1000 });

            let studentList = [];
            if (response.data?.students) {
                studentList = response.data.students;
            } else if (response.data?.data) {
                studentList = response.data.data;
            } else if (Array.isArray(response.data)) {
                studentList = response.data;
            }

            // Filter active students on frontend
            const activeStudents = studentList.filter(s => s.status === "active");
            setStudents(activeStudents);
        } catch (error) {
            console.error("Failed to fetch students:", error);
            toast.error("Failed to load students");
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.studentId) {
            toast.error("Please select a student");
            return;
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        try {
            setLoading(true);

            await studentBankAPI.deposit({
                studentId: formData.studentId,
                amount: parseFloat(formData.amount),
                category: formData.category,
                remarks: formData.remarks || "Cash deposit",
                referenceId: formData.referenceId || undefined,
            });

            toast.success("Deposit successful!");
            onSuccess && onSuccess();
        } catch (error) {
            console.error("Deposit failed:", error);
            toast.error(error.response?.data?.message || "Failed to process deposit");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-6 w-6" />
                            <h2 className="text-xl font-bold">Deposit Money</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Student Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Users className="h-4 w-4 inline mr-1" />
                            Select Student <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="studentId"
                            value={formData.studentId}
                            onChange={handleChange}
                            disabled={!!preSelectedStudent}
                            required
                            className="input disabled:bg-gray-100"
                        >
                            <option value="">-- Select Student --</option>
                            {students.map((student) => (
                                <option key={student._id} value={student._id}>
                                    {student.name} ({student.studentId}) - Class {student.class}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            min="0.01"
                            step="0.01"
                            required
                            placeholder="Enter amount"
                            className="input"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category
                        </label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="input"
                        >
                            {CREDIT_CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reference ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reference ID (Optional)
                        </label>
                        <input
                            type="text"
                            name="referenceId"
                            value={formData.referenceId}
                            onChange={handleChange}
                            placeholder="Receipt number, transaction ID, etc."
                            className="input"
                        />
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Remarks
                        </label>
                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleChange}
                            rows="3"
                            placeholder="Add any notes or remarks..."
                            className="input"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-outline btn-md flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-success btn-md flex-1 disabled:opacity-50"
                        >
                            {loading ? "Processing..." : "Deposit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DepositModal;
