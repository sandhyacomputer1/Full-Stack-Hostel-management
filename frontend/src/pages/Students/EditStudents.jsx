// src/pages/Students/EditStudents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { studentsAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  Heart,
  FileText,
  CheckCircle,
  Trash2,
  Eye,
  Calendar,
  Phone,
  Mail,
  Users,
  BookOpen,
  CreditCard,
  Award,
  Utensils,
  DoorOpen,
  Home,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import LoadingSpinner from "../../components/UI/LoadingSpinner";
import ImageUpload from "../../components/UI/ImageUpload";
import Swal from "sweetalert2";

const EditStudent = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: studentId } = useParams();
  const { hostelType } = useAuth();

  const [activeTab, setActiveTab] = useState("basic");
  const [previewDocs, setPreviewDocs] = useState({
    photo: null,
    aadharCard: null,
    addressProof: null,
    idCard: null,
  });
  const [filesToUpload, setFilesToUpload] = useState({
    photo: null,
    aadharCard: null,
    addressProof: null,
    idCard: null,
  });
  const [removedDocs, setRemovedDocs] = useState([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      studentId: "",
      name: "",
      aadharNumber: "",
      phone: "",
      dateOfBirth: "",
      gender: "male",
      bloodGroup: "",
      address: {
        street: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
      },
      father: { name: "", phone: "", email: "", occupation: "" },
      mother: { name: "", phone: "", email: "", occupation: "" },
      guardian: { name: "", phone: "", email: "", occupation: "" },
      class: "",
      batch: "",
      rollNumber: "",
      admissionDate: "",
      roomNumber: "",
      hostelBlock: "",
      status: "active",
      feeStructure: {
        installmentType: "oneTime",
        baseFee: 0,
        admissionFee: 0,
        securityDeposit: 0,
        otherCharges: 0,
        installmentBreakdown: [],
      },
    },
  });

  const {
    fields: installments,
    append,
    remove,
    replace,
  } = useFieldArray({
    control,
    name: "feeStructure.installmentBreakdown",
  });

  // ✅ FIXED: Return student object directly
  const {
    data: studentData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      const res = await studentsAPI.getById(studentId);
      console.log("✅ Edit API Response:", res.data);
      return res.data; // ✅ Return the wrapper object (consistent with StudentDetails)
    },
    enabled: !!studentId,
    retry: 1,
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to load student");
    },
  });

  // ✅ Populate form when data arrives
  useEffect(() => {
    if (!studentData) {
      console.log("⏳ Waiting for student data...");
      return;
    }

    console.log("🔄 Populating form with:", studentData);
    const s = studentData.student || studentData; // Handle both data structures

    // Convert dates
    const dateOfBirth = s.dateOfBirth
      ? new Date(s.dateOfBirth).toISOString().slice(0, 10)
      : "";
    const admissionDate = s.admissionDate
      ? new Date(s.admissionDate).toISOString().slice(0, 10)
      : "";

    // Build feeStructure
    const feeStruct = {
      installmentType: s.feeStructure?.installmentType ?? "oneTime",
      baseFee: s.feeStructure?.baseFee ?? 0,
      admissionFee: s.feeStructure?.admissionFee ?? 0,
      securityDeposit: s.feeStructure?.securityDeposit ?? 0,
      otherCharges: s.feeStructure?.otherCharges ?? 0,
      installmentBreakdown:
        s.feeStructure?.installmentBreakdown?.map((it, idx) => ({
          id: it._id,
          installmentNumber: it.installmentNumber ?? idx + 1,
          amount: it.amount ?? 0,
          dueDate: it.dueDate ? it.dueDate.slice(0, 10) : "",
          status: it.status ?? "pending",
          paidAmount: it.paidAmount ?? 0,
          paidDate: it.paidDate ? it.paidDate.slice(0, 10) : undefined,
        })) ?? [],
    };

    const formObj = {
      studentId: s.studentId ?? "",
      name: s.name ?? "",
      aadharNumber: s.aadharNumber ?? "",
      phone: s.phone ?? "",
      dateOfBirth,
      gender: s.gender ?? "male",
      bloodGroup: s.bloodGroup ?? "",
      address: {
        street: s.address?.street ?? "",
        city: s.address?.city ?? "",
        state: s.address?.state ?? "",
        pincode: s.address?.pincode ?? "",
        country: s.address?.country ?? "India",
      },
      father: {
        name: s.father?.name ?? "",
        phone: s.father?.phone ?? "",
        email: s.father?.email ?? "",
        occupation: s.father?.occupation ?? "",
      },
      mother: {
        name: s.mother?.name ?? "",
        phone: s.mother?.phone ?? "",
        email: s.mother?.email ?? "",
        occupation: s.mother?.occupation ?? "",
      },
      guardian: {
        name: s.guardian?.name ?? "",
        phone: s.guardian?.phone ?? "",
        email: s.guardian?.email ?? "",
        occupation: s.guardian?.occupation ?? "",
      },
      class: s.class ?? "",
      batch: s.batch ?? "",
      rollNumber: s.rollNumber ?? "",
      admissionDate,
      roomNumber: s.roomNumber ?? "",
      hostelBlock: s.hostelBlock ?? "",
      status: s.status ?? "active",
      feeStructure: feeStruct,
    };

    reset(formObj);
    replace(formObj.feeStructure.installmentBreakdown);

    setPreviewDocs({
      photo: s.documents?.photo?.url ?? null,
      aadharCard: s.documents?.aadharCard?.url ?? null,
      addressProof: s.documents?.addressProof?.url ?? null,
      idCard: s.documents?.idCard?.url ?? null,
    });

    setFilesToUpload({
      photo: null,
      aadharCard: null,
      addressProof: null,
      idCard: null,
    });
    setRemovedDocs([]);

    console.log("✅ Form populated successfully!");
  }, [studentData, reset, replace]);

  // Watchers for fee calculations
  const baseFee = Number(watch("feeStructure.baseFee") ?? 0);
  const admissionFee = Number(watch("feeStructure.admissionFee") ?? 0);
  const securityDeposit = Number(watch("feeStructure.securityDeposit") ?? 0);
  const otherCharges = Number(watch("feeStructure.otherCharges") ?? 0);
  const installmentBreakdown = watch("feeStructure.installmentBreakdown") ?? [];

  const installmentsTotal = useMemo(
    () =>
      (installmentBreakdown || []).reduce(
        (s, it) => s + (Number(it?.amount) || 0),
        0
      ),
    [installmentBreakdown]
  );

  const totalPayable = useMemo(
    () => baseFee + admissionFee + securityDeposit + otherCharges,
    [baseFee, admissionFee, securityDeposit, otherCharges]
  );

  const handleAddInstallment = () => {
    if (installmentsTotal >= baseFee) {
      toast.error("Installments sum already equals/exceeds base fee");
      return;
    }
    append({
      installmentNumber: (installments || []).length + 1,
      amount: 0,
      dueDate: "",
      status: "pending",
    });
  };

  const handleRemoveInstallment = (index) => {
    const current = installmentBreakdown[index];
    if (current?.status === "paid") {
      toast.error("Cannot remove a paid installment");
      return;
    }
    remove(index);
    setTimeout(() => {
      const now = (watch("feeStructure.installmentBreakdown") || []).map(
        (it, idx) => ({ ...it, installmentNumber: idx + 1 })
      );
      replace(now);
    }, 0);
  };

  const handleDocumentChange = (field, fileOrUrl) => {
    if (!fileOrUrl) {
      const existing = previewDocs[field];
      if (
        existing &&
        typeof existing === "string" &&
        existing.startsWith("http")
      ) {
        setRemovedDocs((r) => Array.from(new Set([...r, field])));
      }
      setPreviewDocs((p) => ({ ...p, [field]: null }));
      setFilesToUpload((f) => ({ ...f, [field]: null }));
      return;
    }

    if (fileOrUrl instanceof File) {
      const obj = URL.createObjectURL(fileOrUrl);
      setPreviewDocs((p) => ({ ...p, [field]: obj }));
      setFilesToUpload((f) => ({ ...f, [field]: fileOrUrl }));
      setRemovedDocs((r) => r.filter((x) => x !== field));
    } else if (typeof fileOrUrl === "string") {
      setPreviewDocs((p) => ({ ...p, [field]: fileOrUrl }));
      setFilesToUpload((f) => ({ ...f, [field]: null }));
      setRemovedDocs((r) => r.filter((x) => x !== field));
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      return studentsAPI.update(studentId, payload);
    },
    onSuccess: async () => {
      const form = new FormData();
      Object.entries(filesToUpload).forEach(([k, v]) => {
        if (v) form.append(k, v);
      });
      if (removedDocs.length > 0) {
        form.append("removedDocs", JSON.stringify(removedDocs));
      }

      if (Array.from(form.keys()).length > 0) {
        try {
          await studentsAPI.uploadDocuments(studentId, form);
        } catch (err) {
          toast.error("Student saved but document upload/delete failed");
          queryClient.invalidateQueries(["student", studentId]);
          navigate(`/students/${studentId}`);
          return;
        }
      }

      toast.success("Student updated successfully");
      queryClient.invalidateQueries(["student", studentId]);
      navigate(`/students/${studentId}`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update student");
    },
  });

  const onSubmit = async (values) => {
    if (!values.name?.trim()) {
      toast.error("Student name is required");
      setActiveTab("basic");
      return;
    }
    if (!values.father?.name?.trim()) {
      toast.error("Father name is required");
      setActiveTab("parents");
      return;
    }

    const safePayload = { ...values };
    if (studentData?.studentId) safePayload.studentId = studentData.studentId;
    if (studentData?.rollNumber)
      safePayload.rollNumber = studentData.rollNumber;

    if (installmentsTotal > baseFee) {
      toast.error("Sum of installments cannot exceed base fee");
      setActiveTab("fees");
      return;
    }

    const result = await Swal.fire({
      title: "Confirm update",
      text: "Are you sure you want to save changes to this student?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save",
    });

    if (result.isConfirmed) {
      updateMutation.mutate(safePayload);
    }
  };

  if (isLoading || isFetching || !studentData) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/students")}
            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 hover:shadow-md border border-transparent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="ml-3">
            <h1 className="text-2xl font-semibold">Edit Student</h1>
            <p className="text-sm text-gray-500">
              Student ID and Roll number are immutable.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 transform hover:-translate-y-0.5 border border-transparent hover:border-indigo-400"
            disabled={updateMutation.isLoading || isSubmitting}
          >
            {updateMutation.isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-md shadow p-3">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: "basic", label: "Basic Info", Icon: User },
            { id: "contact", label: "Contact", Icon: MapPin },
            { id: "parents", label: "Parents", Icon: Heart },
            { id: "academic", label: "Academic", Icon: MapPin },
            { id: "documents", label: "Documents", Icon: FileText },
            { id: "fees", label: "Fees", Icon: FileText },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${
                activeTab === t.id
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <t.Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Tab */}
        {activeTab === "basic" && (
          <section className="bg-white rounded-md shadow p-6">
            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <User className="h-4 w-4 mr-2 text-indigo-500" />
                  Student ID
                </label>
                <input
                  {...register("studentId")}
                  readOnly
                  className="mt-1 block w-full rounded border-2 border-gray-300 bg-gray-50 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <User className="h-4 w-4 mr-2 text-indigo-500" />
                  Full name *
                </label>
                <input
                  {...register("name", { required: "Name required" })}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-500" />
                  Aadhar
                </label>
                <input
                  {...register("aadharNumber", {
                    validate: (v) =>
                      !v || v.length === 12 || "Aadhar must be 12 digits",
                  })}
                  onInput={(e) =>
                    (e.target.value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 12))
                  }
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                {errors.aadharNumber && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.aadharNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-indigo-500" />
                  Phone
                </label>
                <input
                  {...register("phone", {
                    validate: (v) =>
                      !v || v.length >= 10 || "Phone must be >=10 digits",
                  })}
                  onInput={(e) =>
                    (e.target.value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10))
                  }
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                {errors.phone && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                  DOB
                </label>
                <input
                  type="date"
                  {...register("dateOfBirth")}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-500" />
                  Gender
                </label>
                <select
                  {...register("gender")}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors appearance-none cursor-pointer"
                >
                  {hostelType?.toLowerCase()?.trim() === "boys" ? (
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

              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <Heart className="h-4 w-4 mr-2 text-indigo-500" />
                  Blood group
                </label>
                <select
                  {...register("bloodGroup")}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Contact Tab */}
        {activeTab === "contact" && (
          <section className="bg-white rounded-md shadow p-6">
            <h3 className="text-lg font-medium mb-4">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
                  Street
                </label>
                <input
                  {...register("address.street")}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
                  City
                </label>
                <input
                  {...register("address.city")}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
                  State
                </label>
                <input
                  {...register("address.state")}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
                  PIN
                </label>
                <input
                  {...register("address.pincode")}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
                  Country
                </label>
                <input
                  {...register("address.country")}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
              </div>
            </div>
          </section>
        )}

        {/* Parents Tab */}
        {activeTab === "parents" && (
          <section className="bg-white rounded-md shadow p-6">
            <h3 className="text-lg font-medium mb-4">Parents & Guardian</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Father */}
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-500" />
                  Father
                </h4>
                <input
                  placeholder="Name"
                  {...register("father.name", {
                    required: "Father name required",
                  })}
                  className="mb-2 block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                <input
                  placeholder="Phone"
                  {...register("father.phone", {
                    required: "Father phone required",
                  })}
                  className="mb-2 block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                <input
                  placeholder="Email"
                  {...register("father.email")}
                  className="mb-2 block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                <input
                  placeholder="Occupation"
                  {...register("father.occupation")}
                  className="block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                {errors.father?.name && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.father.name.message}
                  </p>
                )}
                {errors.father?.phone && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.father.phone.message}
                  </p>
                )}
              </div>

              {/* Mother */}
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-500" />
                  Mother
                </h4>
                <input
                  placeholder="Name"
                  {...register("mother.name", {
                    required: "Mother name required",
                  })}
                  className="mb-2 block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                <input
                  placeholder="Phone"
                  {...register("mother.phone")}
                  className="mb-2 block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                <input
                  placeholder="Email"
                  {...register("mother.email")}
                  className="mb-2 block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                <input
                  placeholder="Occupation"
                  {...register("mother.occupation")}
                  className="block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                {errors.mother?.name && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.mother.name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-2 flex items-center">
                <Users className="h-4 w-4 mr-2 text-indigo-500" />
                Guardian
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  placeholder="Guardian name"
                  {...register("guardian.name")}
                  className="block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                <input
                  placeholder="Guardian phone"
                  {...register("guardian.phone")}
                  className="block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
                <input
                  placeholder="Guardian email"
                  {...register("guardian.email")}
                  className="block w-full rounded border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
              </div>
            </div>
          </section>
        )}

        {/* Academic Tab */}
        {activeTab === "academic" && (
          <section className="bg-white rounded-md shadow p-6">
            <h3 className="text-lg font-medium mb-4">Academic</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
                  Class
                </label>
                <select
                  {...register("class", { required: "Class required" })}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select Class</option>
                  <option value="10th">10th Grade</option>
                  <option value="11th">11th Grade</option>
                  <option value="12th">12th Grade</option>
                  <option value="Undergraduate">Undergraduate</option>
                </select>
                {errors.class && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.class.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                  Batch
                </label>
                <select
                  {...register("batch", { required: "Batch required" })}
                  className="mt-1 block w-full rounded border-2 border-gray-300 text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select Batch</option>
                  <option value="2023-24">2023-24</option>
                  <option value="2024-25">2024-25</option>
                </select>
                {errors.batch && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.batch.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-500" />
                  Roll Number
                </label>
                <input
                  {...register("rollNumber")}
                  readOnly
                  className="mt-1 block w-full rounded border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Roll number is immutable.
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                  Admission Date
                </label>
                <input
                  type="date"
                  {...register("admissionDate")}
                  className="mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <Home className="h-4 w-4 mr-2 text-indigo-500" />
                  Room Number
                </label>
                <input
                  {...register("roomNumber")}
                  className="mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <Home className="h-4 w-4 mr-2 text-indigo-500" />
                  Hostel Block
                </label>
                <input
                  {...register("hostelBlock")}
                  className="mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <section className="bg-white rounded-md shadow p-6">
            <h3 className="text-lg font-medium mb-4">Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <ImageUpload
                  label="Student Photo"
                  name="photo"
                  value={previewDocs.photo}
                  onChange={(f) => handleDocumentChange("photo", f)}
                  accept="image/*"
                  type="image"
                  preview
                />
                {previewDocs.photo &&
                  typeof previewDocs.photo === "string" &&
                  previewDocs.photo.startsWith("http") && (
                    <div className="flex gap-2 mt-2">
                      <a
                        href={previewDocs.photo}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm"
                      >
                        <Eye className="h-4 w-4" /> View
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDocumentChange("photo", null)}
                        className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm text-red-600"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  )}
              </div>

              <ImageUpload
                label="Aadhar Card"
                name="aadharCard"
                value={previewDocs.aadharCard}
                onChange={(f) => handleDocumentChange("aadharCard", f)}
                accept="image/*,application/pdf"
                type="document"
                preview
              />
              {previewDocs.aadharCard &&
                typeof previewDocs.aadharCard === "string" &&
                previewDocs.aadharCard.startsWith("http") && (
                  <div className="flex gap-2 mt-2">
                    <a
                      href={previewDocs.aadharCard}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm"
                    >
                      <Eye className="h-4 w-4" /> View
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDocumentChange("aadharCard", null)}
                      className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm text-red-600"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                )}

              <ImageUpload
                label="Address Proof"
                name="addressProof"
                value={previewDocs.addressProof}
                onChange={(f) => handleDocumentChange("addressProof", f)}
                accept="image/*,application/pdf"
                type="document"
                preview
              />
              {previewDocs.addressProof &&
                typeof previewDocs.addressProof === "string" &&
                previewDocs.addressProof.startsWith("http") && (
                  <div className="flex gap-2 mt-2">
                    <a
                      href={previewDocs.addressProof}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm"
                    >
                      <Eye className="h-4 w-4" /> View
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDocumentChange("addressProof", null)}
                      className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm text-red-600"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                )}

              <ImageUpload
                label="ID Card (College/School)"
                name="idCard"
                value={previewDocs.idCard}
                onChange={(f) => handleDocumentChange("idCard", f)}
                accept="image/*,application/pdf"
                type="document"
                preview
              />
              {previewDocs.idCard &&
                typeof previewDocs.idCard === "string" &&
                previewDocs.idCard.startsWith("http") && (
                  <div className="flex gap-2 mt-2">
                    <a
                      href={previewDocs.idCard}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm"
                    >
                      <Eye className="h-4 w-4" /> View
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDocumentChange("idCard", null)}
                      className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm text-red-600"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* Fees Tab */}
        {activeTab === "fees" && (
          <section className="bg-white rounded-md shadow p-6">
            <h3 className="text-lg font-medium mb-4">Fee Structure</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-indigo-500" />
                  Installment Type
                </label>
                <select
                  {...register("feeStructure.installmentType")}
                  className="mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="oneTime">One-time</option>
                  <option value="twoInstallments">2 Installments</option>
                  <option value="threeInstallments">3 Installments</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600">Base Fee</label>
                <input
                  type="number"
                  {...register("feeStructure.baseFee", { valueAsNumber: true })}
                  className="mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600">
                  Admission Fee
                </label>
                <input
                  type="number"
                  {...register("feeStructure.admissionFee", {
                    valueAsNumber: true,
                  })}
                  className="mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600">
                  Security Deposit
                </label>
                <input
                  type="number"
                  {...register("feeStructure.securityDeposit", {
                    valueAsNumber: true,
                  })}
                  className="mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600">
                  Other Charges
                </label>
                <input
                  type="number"
                  {...register("feeStructure.otherCharges", {
                    valueAsNumber: true,
                  })}
                  className="mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600">
                  Total Payable (calc)
                </label>
                <div className="mt-1 text-lg font-semibold">
                  ₹{totalPayable.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  Installments sum: ₹{installmentsTotal.toLocaleString()}
                </div>
              </div>
            </div>

            {/* installments */}
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Installment Breakdown</h4>
                <div>
                  <button
                    type="button"
                    onClick={handleAddInstallment}
                    disabled={installmentsTotal >= baseFee}
                    className={`px-3 py-1 rounded text-sm ${
                      installmentsTotal >= baseFee
                        ? "bg-gray-200 text-gray-500"
                        : "border text-primary-600"
                    }`}
                  >
                    + Add Installment
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {installments.map((it, idx) => {
                  const current = installmentBreakdown[idx] || {};
                  const status = current.status ?? it.status ?? "pending";
                  const isPaid = status === "paid";

                  return (
                    <div
                      key={it.id}
                      className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end border rounded p-3"
                    >
                      <div>
                        <label className="block text-sm text-gray-600">#</label>
                        <input
                          value={it.installmentNumber}
                          readOnly
                          className="mt-1 block w-full rounded border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600">
                          Amount
                        </label>
                        <input
                          type="number"
                          {...register(
                            `feeStructure.installmentBreakdown.${idx}.amount`,
                            { valueAsNumber: true }
                          )}
                          readOnly={isPaid}
                          className={`mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm ${
                            isPaid ? "bg-gray-50 cursor-not-allowed" : ""
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600">
                          Due Date
                        </label>
                        <input
                          type="date"
                          {...register(
                            `feeStructure.installmentBreakdown.${idx}.dueDate`
                          )}
                          readOnly={isPaid}
                          className={`mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm ${
                            isPaid ? "bg-gray-50 cursor-not-allowed" : ""
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          {...register(
                            `feeStructure.installmentBreakdown.${idx}.status`
                          )}
                          disabled={isPaid}
                          className={`mt-1 block w-full rounded border-gray-200 px-3 py-2 text-sm ${
                            isPaid ? "bg-gray-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>

                        {isPaid ? (
                          <span className="inline-flex items-center text-green-600 font-semibold">
                            <CheckCircle className="h-5 w-5 mr-1" /> Paid
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveInstallment(idx)}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/students")}
              className="px-3 py-2 border rounded text-sm text-gray-600 hover:bg-red-50 bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 hover:shadow-md border border-transparent"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              Sum: ₹ {installmentsTotal.toLocaleString()}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditStudent;
