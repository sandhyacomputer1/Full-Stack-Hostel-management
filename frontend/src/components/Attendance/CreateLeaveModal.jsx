// src/components/Attendance/CreateLeaveModal.jsx
import React, { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import { leaveAPI, studentsAPI } from "../../services/api";
import Swal from "sweetalert2";

const CreateLeaveModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    studentId: "",
    leaveType: "home",
    fromDate: "",
    toDate: "",
    reason: "",
    contactNumber: "",
    emergencyContact: "",
    destinationAddress: "",
  });

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  // src/components/Attendance/CreateLeaveModal.jsx

  const loadStudents = async () => {
    try {
      // Try different approaches based on your API structure
      // Option 1: No parameters (get all students)
      const res = await studentsAPI.getAll();

      // Extract students from response (handle different response structures)
      let studentList = [];

      if (res.data.students) {
        studentList = res.data.students;
      } else if (res.data.data) {
        studentList = res.data.data;
      } else if (Array.isArray(res.data)) {
        studentList = res.data;
      }

      // Filter only active students on frontend
      const activeStudents = studentList.filter((s) => s.status === "active");
      setStudents(activeStudents);
    } catch (err) {
      console.error("Load students error:", err);

      // Fallback: Try with different parameters
      try {
        const res = await studentsAPI.getAll({});
        const studentList =
          res.data.students || res.data.data || res.data || [];
        const activeStudents = studentList.filter((s) => s.status === "active");
        setStudents(activeStudents);
      } catch (fallbackErr) {
        console.error("Fallback load students error:", fallbackErr);
        Swal.fire({
          icon: "warning",
          title: "Could not load students",
          text: "Please refresh the page or contact support",
        });
      }
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateDays = () => {
    if (formData.fromDate && formData.toDate) {
      const start = new Date(formData.fromDate);
      const end = new Date(formData.toDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.studentId) {
      Swal.fire("Error", "Please select a student", "error");
      return;
    }

    if (!formData.fromDate || !formData.toDate) {
      Swal.fire("Error", "Please select leave dates", "error");
      return;
    }

    if (new Date(formData.toDate) < new Date(formData.fromDate)) {
      Swal.fire("Error", "End date cannot be before start date", "error");
      return;
    }

    if (formData.reason.length < 10) {
      Swal.fire("Error", "Reason must be at least 10 characters", "error");
      return;
    }

    try {
      setLoading(true);

      await leaveAPI.create(formData);

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Leave application submitted successfully",
        timer: 2000,
      });

      onSuccess();
    } catch (err) {
      console.error("Submit leave error:", err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to submit leave application",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-900">
            New Leave Application
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Student Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Student *
            </label>
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
            />
            <select
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- Select Student --</option>
              {filteredStudents.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} - {student.rollNumber} ({student.block})
                </option>
              ))}
            </select>
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leave Type *
            </label>
            <select
              name="leaveType"
              value={formData.leaveType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="home">🏠 Going Home</option>
              <option value="sick">🤒 Sick Leave</option>
              <option value="emergency">🚨 Emergency</option>
              <option value="vacation">🏖️ Vacation</option>
              <option value="personal">👤 Personal</option>
              <option value="other">📋 Other</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date *
              </label>
              <input
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date *
              </label>
              <input
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={
                  formData.fromDate || new Date().toISOString().split("T")[0]
                }
                required
              />
            </div>
          </div>

          {/* Duration Display */}
          {formData.fromDate && formData.toDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-blue-900 font-medium">
                  Total Duration: {calculateDays()} day(s)
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Leave *
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="4"
              placeholder="Please provide detailed reason for leave (minimum 10 characters)"
              minLength={10}
              maxLength={500}
              required
            />
            <div className="text-sm text-gray-500 mt-1">
              {formData.reason.length}/500 characters
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number
              </label>
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact
              </label>
              <input
                type="tel"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination Address
            </label>
            <textarea
              name="destinationAddress"
              value={formData.destinationAddress}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="2"
              placeholder="Where will you be during leave?"
            />
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Your leave application will be sent to the
              warden for approval. You will be notified once it's approved or
              rejected.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLeaveModal;
