import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesAPI } from "../../services/api";
import EmployeeForm from "./EmployeeForm";
import Swal from "sweetalert2";

const AddEmployeeTab = ({ onSuccess }) => {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (formData, files) => {
        try {
            setIsSubmitting(true);

            console.log("📤 Submitting employee data:", formData);
            console.log("📎 Files to upload:", Object.keys(files));

            const formDataToSend = new FormData();

            // ✅ FIXED: Exclude form-only fields
            const excludeFields = ['userId', 'createLogin', 'email', 'password'];

            Object.entries(formData).forEach(([key, value]) => {
                // Skip excluded fields
                if (excludeFields.includes(key)) {
                    return;
                }

                if (key === 'emergencyContact') {
                    formDataToSend.append(key, JSON.stringify(value));
                } else if (value !== undefined && value !== null && value !== '') {
                    formDataToSend.append(key, value);
                }
            });

            // ✅ FIXED: Add createLogin flag separately if true
            if (formData.createLogin === true) {
                formDataToSend.append('createLogin', 'true');
                if (formData.email) {
                    formDataToSend.append('email', formData.email);
                }
                if (formData.password) {
                    formDataToSend.append('password', formData.password);
                }
            }

            // Append files
            Object.entries(files).forEach(([key, file]) => {
                if (file instanceof File) {
                    formDataToSend.append(key, file);
                }
            });

            // Log what's being sent (for debugging)
            console.log("📦 FormData contents:");
            for (let [key, value] of formDataToSend.entries()) {
                if (value instanceof File) {
                    console.log(`  ${key}: [File] ${value.name}`);
                } else if (key === 'password') {
                    console.log(`  ${key}: ***HIDDEN***`);
                } else {
                    console.log(`  ${key}:`, value);
                }
            }

            const response = await employeesAPI.create(formDataToSend);

            console.log("✅ Employee created:", response.data);

            await Swal.fire({
                icon: "success",
                title: "Employee Added Successfully!",
                html: `
                <p><strong>${response.data.employee.fullName}</strong> has been added to the system.</p>
                <p class="text-sm text-gray-600 mt-2">Employee Code: <strong>${response.data.employee.employeeCode}</strong></p>
                ${response.data.loginCreated ? `<p class="text-sm text-green-600 mt-2">✅ Login account created successfully!</p>` : ''}
            `,
                timer: 3000,
                showConfirmButton: false
            });

            queryClient.invalidateQueries({ queryKey: ["employees"] });

            if (onSuccess) {
                onSuccess();
            }

        } catch (error) {
            console.error("❌ Add Employee Error:", error);

            Swal.fire({
                icon: "error",
                title: "Failed to Add Employee",
                text: error.response?.data?.message || error.message || "An error occurred while adding the employee",
                confirmButtonColor: "#dc2626"
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="py-6">
            <EmployeeForm
                title="Add New Employee"
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default AddEmployeeTab;
