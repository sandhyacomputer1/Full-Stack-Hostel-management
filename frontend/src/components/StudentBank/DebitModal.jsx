// src/components/StudentBank/DebitModal.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { studentBankAPI, studentsAPI } from "../../services/api";
import { X, ShoppingCart, Users, Wallet } from "lucide-react";
import { DEBIT_CATEGORIES } from "../../constants/bankConstants";

const DebitModal = ({ onClose, onSuccess, preSelectedStudent = null }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudentBalance, setSelectedStudentBalance] = useState(null);
    const [formData, setFormData] = useState({
        studentId: preSelectedStudent?._id || "",
        amount: "",
        category: "canteen",
        remarks: "",
        referenceId: "",
    });

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        if (formData.studentId) {
            fetchBalance(formData.studentId);
        } else {
            setSelectedStudentBalance(null);
        }
    }, [formData.studentId]);

    const fetchStudents = async () => {
        try {
            const response = await studentsAPI.getAll({ limit: 1000 }); // Remove status param

            let studentList = [];
            if (response.data?.students) {
                studentList = response.data.students;
            } else if (response.data?.data) {
                studentList = response.data.data;
            } else if (Array.isArray(response.data)) {
                studentList = response.data;
            }

            // Filter active students
            const activeStudents = studentList.filter(s => s.status === "active");
            setStudents(activeStudents);
        } catch (error) {
            console.error("Failed to fetch students:", error);
            toast.error("Failed to load students");
        }
    };


    const fetchBalance = async (studentId) => {
        try {
            const response = await studentBankAPI.getBalance(studentId);
            setSelectedStudentBalance(response.data.balance);
        } catch (error) {
            console.error("Failed to fetch balance:", error);
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

        if (!formData.remarks.trim()) {
            toast.error("Please provide remarks for the debit");
            return;
        }

        // Check balance
        if (
            selectedStudentBalance !== null &&
            parseFloat(formData.amount) > selectedStudentBalance
        ) {
            toast.error(
                `Insufficient balance. Available: ₹${selectedStudentBalance}`
            );
            return;
        }

        try {
            setLoading(true);

            await studentBankAPI.debit({
                studentId: formData.studentId,
                amount: parseFloat(formData.amount),
                category: formData.category,
                remarks: formData.remarks,
                referenceId: formData.referenceId || undefined,
            });

            toast.success("Debit successful!");
            onSuccess && onSuccess();
        } catch (error) {
            console.error("Debit failed:", error);
            toast.error(error.response?.data?.message || "Failed to process debit");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="h-6 w-6" />
                            <h2 className="text-xl font-bold">Debit Money</h2>
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

                    {/* Balance Display */}
                    {selectedStudentBalance !== null && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <Wallet className="h-5 w-5 text-blue-600 mr-2" />
                                    <span className="text-sm text-blue-700 font-medium">
                                        Available Balance
                                    </span>
                                </div>
                                <span className="text-2xl font-bold text-blue-900">
                                    ₹{selectedStudentBalance.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

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
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            required
                            className="input"
                        >
                            {DEBIT_CATEGORIES.map((cat) => (
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
                            placeholder="Bill number, order ID, etc."
                            className="input"
                        />
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Remarks <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleChange}
                            rows="3"
                            required
                            placeholder="Describe the expense..."
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
                            className="btn btn-danger btn-md flex-1 disabled:opacity-50"
                        >
                            {loading ? "Processing..." : "Debit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DebitModal;
