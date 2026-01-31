import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { studentsAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  FileText,
  ArrowRight,
  ArrowLeft as BackArrow,
  CalendarDays,
  Droplet,
  IdCard,
  IndianRupee,
  Layers,
  Home,
  Building2,
  LocateFixed,
  Globe,
  Briefcase,
  GraduationCap,
  Hash,
  BedDouble,
  X,
  Save,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import LoadingSpinner from "../../components/UI/LoadingSpinner";
import ImageUpload from "../../components/UI/ImageUpload";

const AddStudent = () => {
  const navigate = useNavigate();
  const { hostelType } = useAuth();
  const [activeTab, setActiveTab] = useState("basic");
  const [completedTabs, setCompletedTabs] = useState(new Set());
  const [documents, setDocuments] = useState({
    photo: null,
    aadharCard: null,
    addressProof: null,
    idCard: null,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
  } = useForm({
    defaultValues: {
      aadharNumber: "",
      gender: "male",
      status: "active",
      feeStructure: {
        installmentType: "",
        baseFee: 0,
        installmentBreakdown: [],
      },
      father: {
        name: "",
        phone: "",
        email: "",
        occupation: "",
      },
      mother: {
        name: "",
        phone: "",
        email: "",
        occupation: "",
      },
      address: {
        street: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
      },
    },
  });

  const selectedInstallmentType = watch("feeStructure.installmentType");

  const { fields: installmentFields, replace: replaceInstallments } =
    useFieldArray({
      control,
      name: "feeStructure.installmentBreakdown",
    });

  const createStudentMutation = useMutation({
    mutationFn: async (formData) => {
      const studentResponse = await studentsAPI.create(formData);
      toast.success("Student created successfully");
      toast.loading("Uploading documents...", { id: "uploadDocs" });

      const studentId = studentResponse.data.student.id;

      const hasDocuments = Object.values(documents).some((doc) => doc !== null);
      if (hasDocuments) {
        try {
          await uploadDocuments(studentId);
          toast.success("Documents uploaded successfully", {
            id: "uploadDocs",
          });
        } catch (error) {
          console.error("Document upload error:", error);
          toast.error("Document upload failed");
        }
      } else {
        toast.dismiss("uploadDocs");
      }

      return { studentId, studentResponse };
    },

    onSuccess: (data) => {
      toast.success("Student added successfully!");
      navigate(`/students/${data.studentId}`);
    },

    onError: (error) => {
      console.error("Student creation error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        "Failed to add student";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data) => {
    console.log("Form data being submitted:", data);

    // Validate required fields
    if (!data.name?.trim()) {
      toast.error("Student name is required");
      setActiveTab("basic");
      return;
    }
    if (!data.aadharNumber?.trim()) {
      toast.error("Aadhar number is required");
      setActiveTab("basic");
      return;
    }

    if (!data.phone?.trim()) {
      toast.error("Student phone number is required");
      setActiveTab("basic");
      return;
    }

    if (!data.dateOfBirth) {
      toast.error("Date of birth is required");
      setActiveTab("basic");
      return;
    }

    if (!data.class?.trim()) {
      toast.error("Class is required");
      setActiveTab("academic");
      return;
    }

    if (!data.batch?.trim()) {
      toast.error("Batch is required");
      setActiveTab("academic");
      return;
    }

    if (!data.rollNumber?.trim()) {
      toast.error("Roll number is required");
      setActiveTab("academic");
      return;
    }

    if (!data.father?.name?.trim()) {
      toast.error("Father name is required");
      setActiveTab("parents");
      return;
    }

    if (!data.father?.phone?.trim()) {
      toast.error("Father phone number is required");
      setActiveTab("parents");
      return;
    }

    if (!data.mother?.name?.trim()) {
      toast.error("Mother name is required");
      setActiveTab("parents");
      return;
    }

    if (!data.feeStructure.baseFee || data.feeStructure.baseFee <= 0) {
      toast.error("Please enter base fee");
      setActiveTab("fees");
      return;
    }

    if (!data.feeStructure.installmentType) {
      toast.error("Please select an installment type");
      setActiveTab("fees");
      return;
    }

    createStudentMutation.mutate(data);
  };

  const uploadDocuments = async (studentId) => {
    const formData = new FormData();

    Object.entries(documents).forEach(([key, file]) => {
      if (file) {
        formData.append(key, file);
      }
    });

    if (
      formData.has("photo") ||
      formData.has("aadharCard") ||
      formData.has("addressProof") ||
      formData.has("idCard")
    ) {
      try {
        await studentsAPI.uploadDocuments(studentId, formData);
      } catch (error) {
        console.error("Error uploading documents:", error);
        toast.error(`Error: ${error.message}`);
      }
    }
  };

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const handleDocumentChange = (name, file) => {
    if (!file) return;

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        `Invalid file type for ${name}. Allowed types: JPG, PNG, PDF, DOC, DOCX`
      );
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      toast.error(`File size for ${name} exceeds 5MB limit`);
      return;
    }

    // Update state if valid
    setDocuments((prev) => ({
      ...prev,
      [name]: file,
    }));
  };

  // Auto-generate roll number
  const generateRollNumber = React.useCallback(
    async (studentClass, batch) => {
      try {
        const response = await studentsAPI.getNextRollNumber(
          studentClass,
          batch
        );
        setValue("rollNumber", response.data.nextRollNumber);
        toast.success(
          `Auto-generated roll number: ${response.data.nextRollNumber}`
        );
      } catch (error) {
        console.error("Error generating roll number:", error);
      }
    },
    [setValue]
  );

  const watchClass = watch("class");
  const watchBatch = watch("batch");

  React.useEffect(() => {
    if (watchClass && watchBatch) {
      generateRollNumber(watchClass, watchBatch);
    }
  }, [watchClass, watchBatch, generateRollNumber]);

  // Update installments when type changes
  React.useEffect(() => {
    let count = 0;
    switch (selectedInstallmentType) {
      case "oneTime":
        count = 1;
        break;
      case "twoInstallments":
        count = 2;
        break;
      case "threeInstallments":
        count = 3;
        break;
      case "monthly":
        count = 12;
        break;
      default:
        count = 0;
    }

    const previous = installmentFields;

    const newInstallments = Array.from({ length: count }, (_, i) => ({
      installmentNumber: i + 1,
      amount: previous[i]?.amount || "",
      dueDate: previous[i]?.dueDate || "",
    }));

    replaceInstallments(newInstallments);
  }, [selectedInstallmentType, replaceInstallments]);

  // Tab navigation
  const tabs = [
    { id: "basic", name: "Basic Info", icon: User },
    { id: "contact", name: "Contact", icon: Phone },
    { id: "parents", name: "Parents", icon: Heart },
    { id: "academic", name: "Academic", icon: Mail },
    { id: "documents", name: "Documents", icon: FileText },
    { id: "fees", name: "Fee Structure", icon: MapPin },
  ];

  const getCurrentTabIndex = () =>
    tabs.findIndex((tab) => tab.id === activeTab);
  const isLastTab = () => getCurrentTabIndex() === tabs.length - 1;
  const isFirstTab = () => getCurrentTabIndex() === 0;

  const validateCurrentTab = () => {
    const formData = watch();

    switch (activeTab) {
      case "basic":
        if (!formData.name?.trim()) {
          toast.error("Student name is required");
          return false;
        }
        if (!formData.aadharNumber?.trim()) {
          toast.error("Student aadhar Number is required");
          return false;
        }
        if (!formData.phone?.trim()) {
          toast.error("Student phone number is required");
          return false;
        }
        if (!formData.dateOfBirth) {
          toast.error("Date of birth is required");
          return false;
        }
        break;

      case "parents":
        if (!formData.father?.name?.trim()) {
          toast.error("Father name is required");
          return false;
        }
        if (!formData.father?.phone?.trim()) {
          toast.error("Father phone number is required");
          return false;
        }
        if (!formData.mother?.name?.trim()) {
          toast.error("Mother name is required");
          return false;
        }
        break;

      case "academic":
        if (!formData.class?.trim()) {
          toast.error("Class is required");
          return false;
        }
        if (!formData.batch?.trim()) {
          toast.error("Batch is required");
          return false;
        }
        if (!formData.rollNumber?.trim()) {
          toast.error("Roll number is required");
          return false;
        }
        break;

      case "documents":
        if (!documents.photo) {
          toast.error("Student photo is required");
          return false;
        }
        break;

      case "fees": {
        const currentBaseFee = Number(formData.feeStructure?.baseFee) || 0;
        const installments = formData.feeStructure?.installmentBreakdown || [];

        if (currentBaseFee <= 0) {
          toast.error("Please enter a valid base fee");
          return false;
        }

        if (!formData.feeStructure?.installmentType) {
          toast.error("Please select an installment type");
          return false;
        }

        // Calculate total installment sum
        const totalInstallmentSum = installments.reduce(
          (sum, inst) => sum + (Number(inst.amount) || 0),
          0
        );

        // Validate: Sum < Base Fee
        if (totalInstallmentSum < currentBaseFee) {
          Swal.fire({
            icon: "warning",
            title: "Fees Mismatch!",
            html: `<p style="font-size: 16px;">Total installments <strong>₹${totalInstallmentSum}</strong> are <span style="color: #ef4444; font-weight: bold;">less than</span> the Base Fee <strong>₹${currentBaseFee}</strong>.</p><p style="margin-top: 12px; color: #64748b;">Please either change the installment type or adjust the installment amounts to match the base fee.</p>`,
            confirmButtonText: "Adjust Fees",
            confirmButtonColor: "#3b82f6",
            customClass: {
              popup: 'rounded-lg',
              title: 'text-xl font-bold',
            }
          });
          return false;
        }

        // Validate: Sum > Base Fee
        if (totalInstallmentSum > currentBaseFee) {
          Swal.fire({
            icon: "error",
            title: "Invalid Amount!",
            html: `<p style="font-size: 16px;">Total installments <strong>₹${totalInstallmentSum}</strong> <span style="color: #ef4444; font-weight: bold;">exceed</span> the Base Fee <strong>₹${currentBaseFee}</strong>.</p><p style="margin-top: 12px; color: #64748b;">Please reduce the installment amounts to match exactly with the base fee.</p>`,
            confirmButtonText: "Correct Amounts",
            confirmButtonColor: "#ef4444",
            customClass: {
              popup: 'rounded-lg',
              title: 'text-xl font-bold',
            }
          });
          return false;
        }

        // Check for incomplete installments
        const hasIncomplete = installments.some(inst => !inst.amount || !inst.dueDate);
        if (hasIncomplete) {
          toast.error("Please fill in all installment amounts and due dates");
          return false;
        }
        break;
      }

      default:
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentTab()) {
      setCompletedTabs((prev) => new Set([...prev, activeTab]));
      const currentIndex = getCurrentTabIndex();
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1].id);
      }
    }
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  const TabButton = ({ tab, index }) => {
    const isCompleted = completedTabs.has(tab.id);
    const isActive = activeTab === tab.id;
    const Icon = tab.icon;
    const isLast = index === tabs.length - 1;

    const circleClasses = isCompleted
      ? "bg-green-600 border-green-600 text-white"
      : isActive
        ? "bg-white border-green-600 text-green-700"
        : "bg-white border-gray-300 text-gray-500 group-hover:border-gray-400 group-hover:text-gray-700";

    const labelClasses = isCompleted
      ? "text-green-700"
      : isActive
        ? "text-green-700"
        : "text-gray-500 group-hover:text-gray-700";

    return (
      <div className="flex items-center flex-1 min-w-[160px]">
        <button
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className="group flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${circleClasses}`}
          >
            {isCompleted ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </span>
          <span className={`text-sm font-medium whitespace-nowrap ${labelClasses}`}>{tab.name}</span>
        </button>

        {!isLast && (
          <span
            className={`h-0.5 flex-1 mx-2 rounded transition-colors ${isCompleted ? "bg-green-600" : "bg-gray-200"}`}
          />
        )}
      </div>
    );
  };

  // Calculate real-time fee summary
  const calculateFeeSummary = () => {
    const baseFee = Number(watch("feeStructure.baseFee")) || 0;
    const installments = watch("feeStructure.installmentBreakdown") || [];
    const totalInstallmentSum = installments.reduce(
      (sum, inst) => sum + (Number(inst.amount) || 0),
      0
    );
    const difference = totalInstallmentSum - baseFee;

    return { baseFee, totalInstallmentSum, difference };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/students")}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Add New Student
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Fill in the student information below
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center overflow-x-auto">
            {tabs.map((tab, index) => (
              <TabButton key={tab.id} tab={tab} index={index} />
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Basic Information Tab */}
          {activeTab === "basic" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group space-y-1">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>Full Name *</span>
                  </label>
                  <input
                    type="text"
                    {...register("name", { required: "Name is required" })}
                    className={`input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.name ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <p className="form-error mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="form-group space-y-1">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <IdCard className="h-4 w-4 text-gray-500" />
                    <span>Aadhar Card Number *</span>
                  </label>
                  <input
                    type="text"
                    {...register("aadharNumber", {
                      required: "Aadhar Number is required",
                      validate: (value) =>
                        value.length === 12 ||
                        "Aadhar number must be 12 digits",
                    })}
                    onInput={(e) => {
                      e.target.value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 12);
                    }}
                    className={`input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.aadharNumber ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                    placeholder="Enter 12-digit Aadhar number"
                  />
                  {errors.aadharNumber && (
                    <p className="form-error mt-1 text-sm text-red-600">{errors.aadharNumber.message}</p>
                  )}
                </div>

                <div className="form-group space-y-1">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>Phone Number *</span>
                  </label>
                  <input
                    type="tel"
                    {...register("phone", {
                      required: "Phone is required",
                      validate: (value) =>
                        value.length >= 10 ||
                        "Phone number must be at least 10 digits",
                    })}
                    onInput={(e) => {
                      e.target.value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);
                    }}
                    className={`input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.phone ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="form-error mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                <div className="form-group space-y-1">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    <span>Date of Birth *</span>
                  </label>
                  <input
                    type="date"
                    {...register("dateOfBirth", {
                      required: "Date of birth is required",
                    })}
                    className={`input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.dateOfBirth ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                  />
                  {errors.dateOfBirth && (
                    <p className="form-error mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
                  )}
                </div>

                <div className="form-group space-y-1">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>Gender *</span>
                  </label>
                  <select
                    {...register("gender")}
                    className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    {hostelType?.toLowerCase().trim() === "boys" ? (
                      <>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                      </>
                    ) : (
                      <>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group space-y-1">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Droplet className="h-4 w-4 text-gray-500" />
                    <span>Blood Group</span>
                  </label>
                  <select
                    {...register("bloodGroup")}
                    className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information Tab */}
          {activeTab === "contact" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Address Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group md:col-span-2">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Home className="h-4 w-4 text-gray-500" />
                    <span>Street Address</span>
                  </label>
                  <input
                    type="text"
                    {...register("address.street")}
                    className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                    placeholder="Enter street address"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span>City</span>
                  </label>
                  <input
                    type="text"
                    {...register("address.city")}
                    className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                    placeholder="Enter city"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>State</span>
                  </label>
                  <input
                    type="text"
                    {...register("address.state")}
                    className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                    placeholder="Enter state"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <LocateFixed className="h-4 w-4 text-gray-500" />
                    <span>PIN Code</span>
                  </label>
                  <input
                    type="text"
                    {...register("address.pincode")}
                    className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                    placeholder="Enter PIN code"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span>Country</span>
                  </label>
                  <input
                    type="text"
                    {...register("address.country")}
                    className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                    placeholder="Enter country"
                    defaultValue="India"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Parents Information Tab */}
          {activeTab === "parents" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Parents Information
              </h3>

              {/* Father's Information */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-4">
                  Father's Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>Father's Name *</span>
                    </label>
                    <input
                      type="text"
                      {...register("father.name", {
                        required: "Father name is required",
                      })}
                      className={`input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.father?.name ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                      placeholder="Enter father's name"
                    />
                    {errors.father?.name && (
                      <p className="form-error">{errors.father.name.message}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>Father's Phone *</span>
                    </label>
                    <input
                      type="tel"
                      {...register("father.phone", {
                        required: "Father phone is required",
                        validate: (value) =>
                          value.length >= 10 ||
                          "phone number must be at least 10 digits",
                      })}
                      className={`input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.father?.phone ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                      onInput={(e) =>
                      (e.target.value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10))
                      }
                      placeholder="Enter father's phone"
                    />
                    {errors.father?.phone && (
                      <p className="form-error">
                        {errors.father.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>Father's Email</span>
                    </label>
                    <input
                      type="email"
                      {...register("father.email")}
                      className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                      placeholder="Enter father's email"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span>Father's Occupation</span>
                    </label>
                    <input
                      type="text"
                      {...register("father.occupation")}
                      className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                      placeholder="Enter father's occupation"
                    />
                  </div>
                </div>
              </div>

              {/* Mother's Information */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-4">
                  Mother's Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>Mother's Name *</span>
                    </label>
                    <input
                      type="text"
                      {...register("mother.name", {
                        required: "Mother name is required",
                      })}
                      className={`input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.mother?.name ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                      placeholder="Enter mother's name"
                    />
                    {errors.mother?.name && (
                      <p className="form-error">{errors.mother.name.message}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>Mother's Phone</span>
                    </label>
                    <input
                      type="tel"
                      {...register("mother.phone", {
                        validate: (value) =>
                          !value || value.length >= 10 ||
                          "Phone number must be at least 10 digits",
                      })}
                      onInput={(e) => {
                        e.target.value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                      }}
                      className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                      placeholder="Enter mother's phone"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>Mother's Email</span>
                    </label>
                    <input
                      type="email"
                      {...register("mother.email")}
                      className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                      placeholder="Enter mother's email"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span>Mother's Occupation</span>
                    </label>
                    <input
                      type="text"
                      {...register("mother.occupation")}
                      className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                      placeholder="Enter mother's occupation"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Academic Information Tab */}
          {activeTab === "academic" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Academic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <GraduationCap className="h-4 w-4 text-gray-500" />
                    <span>Class *</span>
                  </label>
                  <select
                    {...register("class", { required: "Class is required" })}
                    className={`input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.class ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                  >
                    <option value="">Select Class</option>
                    <option value="1th">1st Grade</option>
                    <option value="2nd">2nd Grade</option>
                    <option value="3rd">3rd Grade</option>
                    <option value="4th">4th Grade</option>
                    <option value="5th">5th Grade</option>
                    <option value="6th">6th Grade</option>
                    <option value="7th">7th Grade</option>
                    <option value="8th">8th Grade</option>
                    <option value="9th">9th Grade</option>
                    <option value="10th">10th Grade</option>
                    <option value="11th">11th Grade</option>
                    <option value="12th">12th Grade</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                  {errors.class && (
                    <p className="form-error">{errors.class.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Layers className="h-4 w-4 text-gray-500" />
                    <span>Batch *</span>
                  </label>
                  <select
                    {...register("batch", { required: "Batch is required" })}
                    className={`input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.batch ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                  >
                    <option value="">Select Batch</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                  </select>
                  {errors.batch && (
                    <p className="form-error">{errors.batch.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span>Roll Number *</span>
                  </label>
                  <input
                    type="text"
                    {...register("rollNumber", {
                      required: "Roll number is required",
                    })}
                    className={`input mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.rollNumber ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                    placeholder="Auto-generated after selecting class and batch"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Roll number will be auto-generated based on class and batch
                    selection
                  </p>
                  {errors.rollNumber && (
                    <p className="form-error">{errors.rollNumber.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    <span>Admission Date</span>
                  </label>
                  <input
                    type="date"
                    {...register("admissionDate")}
                    className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <BedDouble className="h-4 w-4 text-gray-500" />
                    <span>Room Number</span>
                  </label>
                  <input
                    type="text"
                    {...register("roomNumber")}
                    className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                    placeholder="Enter room number"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span>Hostel Block</span>
                  </label>
                  <input
                    type="text"
                    {...register("hostelBlock")}
                    className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                    placeholder="Enter hostel block"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Student Documents
              </h3>
              <p className="text-sm text-gray-600">
                Upload required documents. Student photo is required, others are
                optional but recommended.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Photo */}
                <div className="md:col-span-2">
                  <ImageUpload
                    label="Student Photo"
                    name="photo"
                    value={documents.photo}
                    onChange={(file) => handleDocumentChange("photo", file)}
                    accept="image/jpeg,image/png,image/webp"
                    required={true}
                    type="image"
                    preview={true}
                  />
                </div>

                {/* Aadhar Card */}
                <ImageUpload
                  label="Aadhar Card"
                  name="aadharCard"
                  value={documents.aadharCard}
                  onChange={(file) => handleDocumentChange("aadharCard", file)}
                  accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  type="document"
                  preview={true}
                />

                {/* Address Proof */}
                <ImageUpload
                  label="Address Proof"
                  name="addressProof"
                  value={documents.addressProof}
                  onChange={(file) =>
                    handleDocumentChange("addressProof", file)
                  }
                  accept="image/jpeg,image/webp,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  type="document"
                  preview={true}
                />

                {/* ID Card */}
                <ImageUpload
                  label="ID Card (College OR School)"
                  name="idCard"
                  value={documents.idCard}
                  onChange={(file) => handleDocumentChange("idCard", file)}
                  accept="image/jpeg,image/webp,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  type="document"
                  preview={true}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Document Upload Guidelines
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Student photo is mandatory for identification</li>
                        <li>Accepted formats: JPG, PNG, WEBP, PDF, DOC, DOCX</li>
                        <li>Maximum file size: 5MB per document</li>
                        <li>
                          Documents can be viewed by clicking the eye icon after
                          upload
                        </li>
                        <li>
                          You can upload documents later from the student
                          profile page
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fee Structure Tab - UPDATED WITH VALIDATION */}
          {activeTab === "fees" && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Fee Structure</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure the base fee and installment breakdown. Total installments must match the base fee exactly.
                  </p>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Important</p>
                    <p className="text-sm text-blue-700 mt-1">
                      The sum of all installment amounts must equal the base fee. You cannot proceed if there's a mismatch.
                    </p>
                  </div>
                </div>
              </div>

              {/* Base Fee and Installment Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="form-label flex items-center gap-2 font-semibold text-base">
                    <IndianRupee className="h-4 w-4 text-gray-600" />
                    <span>Base Fee (Annual) *</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      className="input pl-8 text-lg font-semibold"
                      placeholder="e.g., 45000"
                      {...register("feeStructure.baseFee", {
                        required: "Base fee is required",
                        valueAsNumber: true,
                        min: { value: 1, message: "Base fee must be greater than 0" }
                      })}
                    />
                  </div>
                  {errors.feeStructure?.baseFee && (
                    <p className="form-error">
                      {errors.feeStructure.baseFee.message}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2 font-semibold text-base">
                    <Layers className="h-4 w-4 text-gray-600" />
                    <span>Installment Type *</span>
                  </label>
                  <select
                    {...register("feeStructure.installmentType", {
                      required: "Installment type is required",
                    })}
                    className={`input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm ${errors.feeStructure?.installmentType ? "border-red-300 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                  >
                    <option value="">Select Installment Type</option>
                    <option value="oneTime">One-time Payment (Full)</option>
                    <option value="twoInstallments">2 Installments (Half-Yearly)</option>
                    <option value="threeInstallments">3 Installments (Trimester)</option>
                    <option value="monthly">12 Installments (Monthly)</option>
                  </select>
                  {errors.feeStructure?.installmentType && (
                    <p className="form-error"> 
                      {errors.feeStructure.installmentType.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Dynamic Installment Inputs */}
              {selectedInstallmentType && installmentFields.length > 0 && (
                <div className="mt-8">
                  {/* Summary Card */}
                  <div className={`rounded-lg border-2 p-4 mb-6 transition-all ${(() => {
                      const { baseFee, totalInstallmentSum, difference } = calculateFeeSummary();
                      if (difference === 0 && baseFee > 0 && totalInstallmentSum > 0) {
                        return "bg-green-50 border-green-500";
                      } else if (difference !== 0 && totalInstallmentSum > 0) {
                        return "bg-red-50 border-red-500";
                      } else {
                        return "bg-gray-50 border-gray-300";
                      }
                    })()
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const { baseFee, totalInstallmentSum, difference } = calculateFeeSummary();
                          if (difference === 0 && baseFee > 0 && totalInstallmentSum > 0) {
                            return (
                              <>
                                <CheckCircle className="h-6 w-6 text-green-600" />
                                <div>
                                  <p className="font-bold text-green-800 text-lg">Perfect Match!</p>
                                  <p className="text-sm text-green-700">All installments sum up correctly</p>
                                </div>
                              </>
                            );
                          } else if (difference < 0) {
                            return (
                              <>
                                <AlertCircle className="h-6 w-6 text-red-600" />
                                <div>
                                  <p className="font-bold text-red-800 text-lg">Amount Short</p>
                                  <p className="text-sm text-red-700">Need ₹{Math.abs(difference)} more</p>
                                </div>
                              </>
                            );
                          } else if (difference > 0) {
                            return (
                              <>
                                <AlertCircle className="h-6 w-6 text-red-600" />
                                <div>
                                  <p className="font-bold text-red-800 text-lg">Amount Exceeded</p>
                                  <p className="text-sm text-red-700">Reduce by ₹{difference}</p>
                                </div>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <AlertCircle className="h-6 w-6 text-gray-500" />
                                <div>
                                  <p className="font-bold text-gray-700 text-lg">Enter Amounts</p>
                                  <p className="text-sm text-gray-600">Fill in the installment details below</p>
                                </div>
                              </>
                            );
                          }
                        })()}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Installments</p>
                        <p className={`text-2xl font-bold ${(() => {
                            const { baseFee, totalInstallmentSum, difference } = calculateFeeSummary();
                            if (difference === 0 && baseFee > 0 && totalInstallmentSum > 0) return "text-green-700";
                            if (difference !== 0 && totalInstallmentSum > 0) return "text-red-700";
                            return "text-gray-700";
                          })()
                          }`}>
                          ₹{calculateFeeSummary().totalInstallmentSum.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          of ₹{calculateFeeSummary().baseFee.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Installment Cards */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-bold text-gray-800">
                        {selectedInstallmentType === "oneTime"
                          ? "Single Payment"
                          : selectedInstallmentType === "monthly"
                            ? `${installmentFields.length} Monthly Installments`
                            : `${installmentFields.length} Installments`}
                      </h4>
                      <span className="text-sm text-gray-500">
                        Fill amount and due date for each
                      </span>
                    </div>

                    {installmentFields.map((field, idx) => (
                      <div
                        key={field.id}
                        className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:border-primary-300 transition-all"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          {/* Installment Number Badge */}
                          <div className="md:col-span-1 flex justify-center">
                            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
                              {idx + 1}
                            </div>
                          </div>

                          {/* Amount Input */}
                          <div className="md:col-span-5">
                            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase mb-2">
                              <IndianRupee className="h-3.5 w-3.5 text-gray-500" />
                              <span>
                                {selectedInstallmentType === "monthly"
                                  ? `Month ${idx + 1} Amount *`
                                  : `Installment ${idx + 1} Amount *`}
                              </span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                className="input pl-8 font-semibold"
                                placeholder="Enter amount"
                                {...register(
                                  `feeStructure.installmentBreakdown.${idx}.amount`,
                                  {
                                    required: "Amount is required",
                                    valueAsNumber: true,
                                    min: { value: 1, message: "Amount must be greater than 0" }
                                  }
                                )}
                              />
                            </div>
                            {errors.feeStructure?.installmentBreakdown?.[idx]?.amount && (
                              <p className="text-xs text-red-600 mt-1">
                                {errors.feeStructure.installmentBreakdown[idx].amount.message}
                              </p>
                            )}
                          </div>

                          {/* Due Date Input */}
                          <div className="md:col-span-6">
                            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase mb-2">
                              <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
                              <span>Due Date *</span>
                            </label>
                            <input
                              type="date"
                              className="input mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 sm:text-sm"
                              {...register(
                                `feeStructure.installmentBreakdown.${idx}.dueDate`,
                                {
                                  required: "Due date is required",
                                }
                              )}
                            />
                            {errors.feeStructure?.installmentBreakdown?.[idx]?.dueDate && (
                              <p className="text-xs text-red-600 mt-1">
                                {errors.feeStructure.installmentBreakdown[idx].dueDate.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 mt-6 border-t">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate("/students")}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              {!isFirstTab() && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                >
                  <BackArrow className="h-4 w-4 mr-2" />
                  Previous
                </button>
              )}
            </div>

            <div className="flex space-x-4">
              {!isLastTab() ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={createStudentMutation.isLoading}
                  className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {createStudentMutation.isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Add Student
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddStudent;
