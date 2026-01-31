import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import {
    Save,
    User,
    Briefcase,
    MapPin,
    Shield,
    FileText,
    Loader2,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Upload,
    X,
    AlertCircle,
    Phone,
    Building,
    Home,
    Users
} from "lucide-react";
import ImageUpload from "../UI/ImageUpload";
import { useAuth } from "../../contexts/AuthContext";
import Swal from "sweetalert2";

const STEPS = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "employment", label: "Employment", icon: Briefcase },
    { id: "address", label: "Contact & Address", icon: MapPin },
    { id: "documents", label: "Documents", icon: Upload },
    { id: "login", label: "Login Access", icon: Shield },
];

const EmployeeForm = ({ initialData = null, onSubmit, isSubmitting, title }) => {
    const { user } = useAuth();
    const [activeStep, setActiveStep] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState({});
    const [previews, setPreviews] = useState({});

    const methods = useForm({
        defaultValues: {
            status: "ACTIVE",
            employmentType: "FULL_TIME",
            shift: "GENERAL",
            role: "",
            createLogin: false,
            password: "Hostel@123",
            email: "",
            emergencyContact: {
                name: "",
                phone: "",
                relation: "",
            },
        },
    });

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
        trigger,
    } = methods;

    const selectedRole = watch("role");
    const createLogin = watch("createLogin");

    // Manage preview URLs safely
    useEffect(() => {
        const newPreviews = {};
        Object.entries(uploadedFiles).forEach(([key, value]) => {
            if (value instanceof File) {
                newPreviews[key] = URL.createObjectURL(value);
            } else if (typeof value === "string") {
                newPreviews[key] = value;
            }
        });
        setPreviews(newPreviews);

        return () => {
            Object.values(newPreviews).forEach((url) => {
                if (url.startsWith("blob:")) URL.revokeObjectURL(url);
            });
        };
    }, [uploadedFiles]);

    // Populate data if in edit mode
    useEffect(() => {
        if (initialData) {
            reset({
                ...initialData,
                createLogin: !!initialData.userId,
                joiningDate: initialData.joiningDate
                    ? new Date(initialData.joiningDate).toISOString().split("T")[0]
                    : "",
            });

            if (initialData.profilePhoto?.url) {
                setUploadedFiles((prev) => ({
                    ...prev,
                    profilePhoto: initialData.profilePhoto.url,
                }));
            }
            if (initialData.documents) {
                initialData.documents.forEach((doc) => {
                    setUploadedFiles((prev) => ({
                        ...prev,
                        [doc.type]: doc.fileUrl,
                    }));
                });
            }
        }
    }, [initialData, reset]);

    const handleNext = async (e) => {
        // ⚠️ CRITICAL: Prevent any form submission
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const fieldsToValidate = getFieldsForStep(activeStep);
        const isValid = await trigger(fieldsToValidate);

        if (isValid) {
            setActiveStep((prev) => prev + 1);
        } else {
            Swal.fire({
                icon: "error",
                title: "Validation Error",
                text: "Please fill all required fields correctly",
                timer: 2000,
                showConfirmButton: false,
            });
        }
    };

    const getFieldsForStep = (step) => {
        switch (step) {
            case 0:
                return ["fullName", "phone", "gender"];
            case 1:
                return ["role", "department", "salary", "joiningDate", "shift"];
            case 2:
                return [
                    "address",
                    "emergencyContact.name",
                    "emergencyContact.phone",
                    "emergencyContact.relation",
                ];
            case 3:
                return [];
            case 4:
                return [];
            default:
                return [];
        }
    };

    const handleFileUpload = (field, file) => {
        setUploadedFiles((prev) => ({ ...prev, [field]: file }));
    };

    const handleFinalSubmit = (data) => {
        // ⚠️ CRITICAL: Guard against premature submission
        if (activeStep < STEPS.length - 1) {
            console.error("🛑 SUBMISSION BLOCKED - NOT ON FINAL STEP");
            return;
        }

        const hostelId =
            typeof user?.assignedHostel === "object"
                ? user.assignedHostel._id
                : user.assignedHostel;

        if (!hostelId) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Hostel assignment missing. Please contact admin.",
            });
            return;
        }

        const formattedData = {
            fullName: data.fullName,
            phone: data.phone,
            gender: data.gender,
            role: data.role,
            department: data.department,
            salary: data.salary,
            joiningDate: data.joiningDate,
            shift: data.shift,
            employmentType: data.employmentType,
            address: data.address,
            emergencyContact: data.emergencyContact,
            status: data.status || "ACTIVE",
            hostelId: hostelId,
            createLogin: createLogin,
            userId: initialData?.userId || null,
            hadLogin: !!initialData?.userId,
        };

        if (createLogin) {
            formattedData.email = data.email;
            formattedData.password = data.password;
        }

        const newFiles = {};
        Object.entries(uploadedFiles).forEach(([field, value]) => {
            if (value instanceof File) newFiles[field] = value;
        });

        onSubmit(formattedData, newFiles);
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Step Indicator */}
            <div className="mb-8 overflow-x-auto pb-4">
                <div className="flex justify-between items-center min-w-[600px]">
                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = activeStep === index;
                        const isCompleted = activeStep > index;

                        return (
                            <React.Fragment key={step.id}>
                                <div
                                    className="flex flex-col items-center relative z-10 group cursor-pointer"
                                    onClick={() =>
                                        (isCompleted || isActive) && setActiveStep(index)
                                    }
                                >
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                            isActive
                                                ? "bg-primary-600 text-white shadow-lg shadow-primary-200 scale-110"
                                                : isCompleted
                                                    ? "bg-green-500 text-white"
                                                    : "bg-gray-100 text-gray-400"
                                            }`}
                                    >
                                        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`mt-2 text-xs font-bold whitespace-nowrap ${isActive ? "text-primary-600" : isCompleted ? "text-green-600" : "text-gray-400"}`}>
                                        {step.label}
                                    </span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`flex-1 h-1 mx-4 rounded-full transition-all duration-500 ${isCompleted ? "bg-green-500" : "bg-gray-100"
                                            }`}
                                    ></div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                    <div className="text-sm font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-wider">
                        Step {activeStep + 1} of {STEPS.length}
                    </div>
                </div>

                <FormProvider {...methods}>
                    <form onSubmit={handleSubmit(handleFinalSubmit)} className="p-8">
                        {/* Step 1: Basic Info */}
                        {activeStep === 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            Personal Information
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Basic details of the employee.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="flex items-center gap-2 mb-2 font-semibold text-gray-700">
                                            <User className="w-4 h-4 text-blue-600" />
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            {...register("fullName", { required: "Name is required" })} 
                                            className="input h-12" 
                                            placeholder="e.g. Rahul Sharma" 
                                        />
                                        {errors.fullName && (
                                            <p className="text-xs text-red-500 mt-1">
                                                {errors.fullName.message}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 mb-2 font-semibold text-gray-700">
                                            <Phone className="w-4 h-4 text-green-600" />
                                            Phone Number <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            {...register("phone", { 
                                                required: "Phone is required", 
                                                pattern: { 
                                                    value: /^[6-9]\d{9}$/, 
                                                    message: "Valid 10-digit number required" 
                                                } 
                                            })} 
                                            className="input h-12" 
                                            placeholder="e.g. 9876543210" 
                                        />
                                        {errors.phone && (
                                            <p className="text-xs text-red-500 mt-1">
                                                {errors.phone.message}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label-text mb-1 block font-semibold text-gray-700">Gender</label>
                                        <select {...register("gender")} className="input h-12">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Employment */}
                        {activeStep === 1 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            Employment Details
                                        </h3>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="flex items-center gap-2 mb-2 font-semibold text-gray-700">
                                            <Briefcase className="w-4 h-4 text-blue-600" />
                                            Staff Role <span className="text-red-500">*</span>
                                        </label>
                                        <select {...register("role", { required: "Role is required" })} className="input h-12">
                                            <option value="">Select Role</option>
                                            <option value="manager">Manager</option>
                                            <option value="warden">Warden</option>
                                            <option value="mess_manager">Mess Manager</option>
                                            <option value="watchman">Watchman / Security</option>
                                            <option value="mess_staff">Mess Staff</option>
                                            <option value="cleaner">Housekeeping</option>
                                        </select>
                                        {errors.role && (
                                            <p className="text-xs text-red-500 mt-1">
                                                {errors.role.message}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 mb-2 font-semibold text-gray-700">
                                            <Building className="w-4 h-4 text-orange-600" />
                                            Department <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            {...register("department", { required: "Department is required" })} 
                                            className="input h-12" 
                                            placeholder="e.g. Security, Mess, Operations" 
                                        />
                                        {errors.department && (
                                            <p className="text-xs text-red-500 mt-1">
                                                {errors.department.message}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label-text mb-1 block font-semibold text-gray-700">
                                            Base Salary (₹) <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            type="number" 
                                            {...register("salary", { required: "Salary is required", min: 0 })} 
                                            className="input h-12" 
                                            placeholder="e.g. 15000" 
                                        />
                                        {errors.salary && (
                                            <p className="text-xs text-red-500 mt-1">
                                                {errors.salary.message}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label-text mb-1 block font-semibold text-gray-700">Joining Date</label>
                                        <input type="date" {...register("joiningDate")} className="input h-12" />
                                    </div>
                                    <div>
                                        <label className="label-text mb-1 block font-semibold text-gray-700">Shift Type</label>
                                        <select {...register("shift")} className="input h-12">
                                            <option value="GENERAL">General (9-6)</option>
                                            <option value="MORNING">Morning Shift</option>
                                            <option value="EVENING">Evening Shift</option>
                                            <option value="NIGHT">Night Shift</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label-text mb-1 block font-semibold text-gray-700">Employment Type</label>
                                        <select {...register("employmentType")} className="input h-12">
                                            <option value="FULL_TIME">Full Time</option>
                                            <option value="PART_TIME">Part Time</option>
                                            <option value="CONTRACT">Contract</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Address & Emergency */}
                        {activeStep === 2 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            Contact & Address
                                        </h3>
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 mb-2 font-semibold text-gray-700">
                                        <Home className="w-4 h-4 text-orange-600" />
                                        Residential Address <span className="text-red-500">*</span>
                                    </label>
                                    <textarea 
                                        {...register("address", { required: "Address is required" })} 
                                        rows="3" 
                                        className="input py-3 h-auto" 
                                        placeholder="Full permanent address..."
                                    />
                                    {errors.address && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {errors.address.message}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-orange-500" />
                                        Emergency Contact Info
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="flex items-center gap-2 mb-2 font-semibold text-gray-700">
                                                <User className="w-4 h-4 text-blue-600" />
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <input 
                                                {...register("emergencyContact.name", { required: "Name is required" })} 
                                                className="input" 
                                                placeholder="Name" 
                                            />
                                            {errors.emergencyContact?.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.emergencyContact.name.message}</p>}
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 mb-2 font-semibold text-gray-700">
                                                <Phone className="w-4 h-4 text-green-600" />
                                                Phone <span className="text-red-500">*</span>
                                            </label>
                                            <input 
                                                {...register("emergencyContact.phone", { 
                                                    required: "Phone is required", 
                                                    pattern: { 
                                                        value: /^[6-9]\d{9}$/, 
                                                        message: "Valid 10-digit number" 
                                                    } 
                                                })} 
                                                className="input" 
                                                placeholder="Phone" 
                                            />
                                            {errors.emergencyContact?.phone && <p className="text-[10px] text-red-500 mt-0.5">{errors.emergencyContact.phone.message}</p>}
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 mb-2 font-semibold text-gray-700">
                                                <Users className="w-4 h-4 text-purple-600" />
                                                Relation <span className="text-red-500">*</span>
                                            </label>
                                            <input 
                                                {...register("emergencyContact.relation", { required: "Relation is required" })} 
                                                className="input" 
                                                placeholder="Relationship" 
                                            />
                                            {errors.emergencyContact?.relation && <p className="text-[10px] text-red-500 mt-0.5">{errors.emergencyContact.relation.message}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Documents */}
                        {activeStep === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><FileText className="w-5 h-5" /></div>
                                    <h3 className="text-xl font-bold text-gray-900">Document Records</h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">
                                    Upload documents for verification (Optional - can be added later)
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="flex flex-col items-center">
                                        <label className="text-sm font-bold text-gray-600 mb-3">Profile Photo</label>
                                        <ImageUpload
                                            value={
                                                previews.profilePhoto
                                                    ? { url: previews.profilePhoto }
                                                    : null
                                            }
                                            onChange={(file) =>
                                                handleFileUpload("profilePhoto", file)
                                            }
                                        />
                                        {previews.profilePhoto && (
                                            <p className="text-xs text-green-600 mt-1">✓ Attached</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="text-sm font-bold text-gray-600 mb-3">Aadhar Card</label>
                                        <ImageUpload
                                            value={
                                                previews.aadhar ? { url: previews.aadhar } : null
                                            }
                                            onChange={(file) =>
                                                handleFileUpload("aadhar", file)
                                            }
                                        />
                                        {previews.aadhar && (
                                            <p className="text-xs text-green-600 mt-1">✓ Attached</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="text-sm font-bold text-gray-600 mb-3">PAN Card</label>
                                        <ImageUpload
                                            value={previews.pan ? { url: previews.pan } : null}
                                            onChange={(file) => handleFileUpload("pan", file)}
                                        />
                                        {previews.pan && (
                                            <p className="text-xs text-green-600 mt-1">✓ Attached</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="text-sm font-bold text-gray-600 mb-3">Resume</label>
                                        <ImageUpload
                                            value={previews.resume ? { url: previews.resume } : null}
                                            onChange={(file) => handleFileUpload("resume", file)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Login Access */}
                        {activeStep === 4 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            System Access
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Enable or disable dashboard login for this employee.
                                        </p>
                                    </div>
                                </div>

                                {["manager", "warden", "watchman", "mess_manager"].includes(
                                    selectedRole
                                ) ? (
                                    <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                                        <div className="flex items-start gap-3">
                                            <input
                                                id="createLogin"
                                                type="checkbox"
                                                {...register("createLogin")}
                                                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                                <label
                                                    htmlFor="createLogin"
                                                    className="font-bold text-blue-900 text-lg cursor-pointer"
                                                >
                                                    Create / Maintain Dashboard Login
                                                </label>
                                                <p className="text-sm text-blue-700 mt-1">
                                                    Role:{" "}
                                                    <strong className="capitalize">
                                                        {selectedRole?.replace("_", " ")}
                                                    </strong>{" "}
                                                    - enable or disable system access.
                                                </p>
                                            </div>
                                        </div>

                                        <>
                                            {createLogin && (
                                                <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
                                                    <h4 className="font-bold text-gray-800 mb-4">Login Credentials</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="label-text mb-1 block font-semibold text-gray-700">
                                                                Email Address <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="email"
                                                                {...register("email", { 
                                                                    required: createLogin ? "Email is required for login" : false,
                                                                    pattern: {
                                                                        value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                                                                        message: "Invalid email format"
                                                                    }
                                                                })}
                                                                className="input h-12"
                                                                placeholder="employee@hostel.com"
                                                            />
                                                            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                                                        </div>
                                                        <div>
                                                            <label className="label-text mb-1 block font-semibold text-gray-700">
                                                                Default Password <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                {...register("password", { 
                                                                    required: createLogin ? "Password is required" : false,
                                                                    minLength: {
                                                                        value: 6,
                                                                        message: "Password must be at least 6 characters"
                                                                    }
                                                                })}
                                                                className="input h-12"
                                                                placeholder="Hostel@123"
                                                            />
                                                            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                💡 Employee can change this after first login
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {!createLogin && (
                                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                    <p className="text-gray-600 text-sm">
                                                        ℹ️ Login access can be enabled later from the employee management page if needed.
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
                                        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-700 font-medium">
                                            System login access not available for{" "}
                                            <strong className="capitalize">
                                                {selectedRole?.replace("_", " ")}
                                            </strong>{" "}
                                            role.
                                        </p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Only Manager, Warden, Watchman, and Mess Manager
                                            can have system access.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-8 border-t border-gray-100 mt-8">
                            {activeStep > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setActiveStep(prev => prev - 1)}
                                    className="btn btn-outline flex items-center gap-2"
                                    disabled={isSubmitting}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Previous
                                </button>
                            )}

                            {activeStep < STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="btn btn-primary flex items-center gap-2 ml-auto"
                                >
                                    Next
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-2 rounded-lg font-medium hover:from-green-700 hover:to-green-800 hover:shadow-md hover:shadow-green-500/25 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2 border border-green-500 ml-auto text-sm"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="animate-spin h-4 w-4" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Save Employee
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </FormProvider>
            </div>
        </div>
    );
};

export default EmployeeForm;
