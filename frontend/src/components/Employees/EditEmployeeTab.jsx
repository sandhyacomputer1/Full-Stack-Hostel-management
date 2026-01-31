import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { employeesAPI } from "../../services/api";
import EmployeeForm from "./EmployeeForm";
import Swal from "sweetalert2";
import LoadingSpinner from "../UI/LoadingSpinner";
import { Edit } from "lucide-react";

const EditEmployeeTab = ({ employee, onSuccess, onCancel }) => {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (employee?._id) {
            fetchFullEmployeeData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employee]);

    const fetchFullEmployeeData = async () => {
        try {
            setLoading(true);
            const response = await employeesAPI.getById(employee._id);
            const emp = response.data.employee;

            const formattedData = {
                ...emp,
                joiningDate: emp.joiningDate
                    ? new Date(emp.joiningDate).toISOString().split("T")[0]
                    : "",
                createLogin: !!emp.userId,
            };

            setInitialData(formattedData);
        } catch (error) {
            console.error("❌ Error fetching employee:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to load employee data",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (formData, files) => {
        try {
            setIsSubmitting(true);

            console.log("📥 RAW FORM DATA RECEIVED:");
            console.log(JSON.stringify(formData, null, 2));

            const formDataToSend = new FormData();

            const excludeFields = ["_id", "__v", "userId", "createLogin", "hadLogin"];

            // Helper function to safely get string value from potential array
            const getStringValue = (value, fieldName) => {
                if (Array.isArray(value)) {
                    console.warn(`⚠️ ARRAY DETECTED in field "${fieldName}":`, value);
                    return value[0];
                }
                return value;
            };

            Object.entries(formData).forEach(([key, value]) => {
                if (excludeFields.includes(key)) {
                    console.log(`⏭️ SKIPPING excluded field: ${key}`);
                    return;
                }

                // ⚠️ CRITICAL FIX: Don't add email/password here - they're handled in login section
                if (key === "email" || key === "password") {
                    console.log(`⏭️ SKIPPING ${key} - will be handled in login section`);
                    return;
                }

                if (key === "emergencyContact") {
                    formDataToSend.append(key, JSON.stringify(value));
                    console.log(`✅ ADDED emergencyContact (JSON):`, value);
                } else if (value !== undefined && value !== null && value !== "") {
                    const stringValue = getStringValue(value, key);
                    formDataToSend.append(key, stringValue);
                    console.log(`✅ ADDED ${key}:`, stringValue);
                } else {
                    console.log(`⏭️ SKIPPING ${key} - empty/null/undefined`);
                }
            });

            const hadLogin = !!formData.hadLogin;
            const wantsLogin = !!formData.createLogin;

            console.log("🔐 LOGIN STATUS:", {
                hadLogin,
                wantsLogin,
                emailRaw: formData.email,
                emailIsArray: Array.isArray(formData.email),
                passwordExists: !!formData.password,
            });

            // OFF -> ON: create new login
            if (!hadLogin && wantsLogin) {
                console.log("🆕 CREATING NEW LOGIN");
                formDataToSend.append("updateLogin", "true");

                if (formData.email) {
                    const emailValue = getStringValue(formData.email, "email");
                    console.log("📧 Adding email:", emailValue, typeof emailValue);
                    formDataToSend.append("email", emailValue);
                }

                if (formData.password) {
                    const passwordValue = getStringValue(formData.password, "password");
                    console.log("🔑 Adding password:", passwordValue ? "***" : "empty", typeof passwordValue);
                    formDataToSend.append("password", passwordValue);
                }
            }

            // ON -> OFF: remove login
            if (hadLogin && !wantsLogin) {
                console.log("🗑️ REMOVING LOGIN");
                formDataToSend.append("removeLogin", "true");
            }

            // ON -> ON: update login credentials
            if (hadLogin && wantsLogin) {
                console.log("🔄 UPDATING EXISTING LOGIN");
                formDataToSend.append("updateLogin", "true");

                if (formData.email) {
                    const emailValue = getStringValue(formData.email, "email");
                    console.log("📧 Updating email:", emailValue, typeof emailValue);
                    formDataToSend.append("email", emailValue);
                }

                if (formData.password) {
                    const passwordValue = getStringValue(formData.password, "password");
                    console.log("🔑 Updating password:", passwordValue ? "***" : "empty", typeof passwordValue);
                    formDataToSend.append("password", passwordValue);
                }
            }

            Object.entries(files).forEach(([key, file]) => {
                if (file instanceof File) {
                    formDataToSend.append(key, file);
                    console.log(`📎 File added: ${key} - ${file.name}`);
                }
            });

            // 🔍 DEBUG: Log FINAL FormData
            console.log("📤 FINAL FormData entries:");
            for (let [key, value] of formDataToSend.entries()) {
                if (key === "password") {
                    console.log(`  ${key}: ***`);
                } else {
                    console.log(`  ${key}:`, value, `(${typeof value})`);
                }
            }

            console.log("🚀 SENDING REQUEST TO:", `PUT /api/employees/${employee._id}`);

            const response = await employeesAPI.update(employee._id, formDataToSend);

            console.log("✅ Update successful:", response.data);

            await Swal.fire({
                icon: "success",
                title: "Employee Updated Successfully!",
                html: `
          <p><strong>${response.data.employee.fullName}</strong> has been updated.</p>
          ${response.data.loginUpdated
                        ? '<p class="text-sm text-green-600 mt-2">Login access updated.</p>'
                        : ""
                    }
        `,
                timer: 3000,
                showConfirmButton: false,
            });

            queryClient.invalidateQueries({ queryKey: ["employees"] });

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("❌ Update Employee Error:", error);
            console.error("Error response:", error.response?.data);

            Swal.fire({
                icon: "error",
                title: "Failed to Update Employee",
                text:
                    error.response?.data?.message ||
                    error.message ||
                    "An error occurred while updating the employee",
                confirmButtonColor: "#dc2626",
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    if (loading) {
        return (
            <div className="py-12">
                <LoadingSpinner />
            </div>
        );
    }

    if (!initialData) {
        return (
            <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mb-4">
                        <p className="text-red-600 font-semibold">Failed to load employee data</p>
                    </div>
                    <button 
                        onClick={onCancel} 
                        className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-all duration-200 flex items-center gap-2 border border-gray-300 text-sm mx-auto"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="py-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-xl text-white">
                            <Edit className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Edit Employee</h2>
                            <p className="text-gray-600 mt-1">Update employee information and details</p>
                        </div>
                    </div>
                </div>

                {/* Form Container */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
                    <EmployeeForm
                        title={`Edit Employee: ${initialData.fullName}`}
                        initialData={initialData}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                    />
                </div>

            {/* Cancel Button */}
            <div className="mt-6 flex justify-center">
                <button
                    onClick={onCancel}
                    className="btn btn-outline"
                    disabled={isSubmitting}
                >
                    Cancel & Go Back
                </button>
            </div>
        </div>
        </div>
    );
};

export default EditEmployeeTab;
