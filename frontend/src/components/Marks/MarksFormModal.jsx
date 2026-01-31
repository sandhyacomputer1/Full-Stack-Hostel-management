// src/components/Marks/MarksFormModal.jsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { marksAPI, studentsAPI } from "../../services/api";
import toast from "react-hot-toast";
import LoadingSpinner from "../UI/LoadingSpinner";
import { Search, X } from "lucide-react";

const MARKS_EXAM_TYPES = [
  { value: "weekly_test", label: "Weekly Test" },
  { value: "monthly_test", label: "Monthly Test" },
  { value: "unit_test", label: "Unit Test" },
  { value: "mid_term", label: "Mid Term" },
  { value: "final_exam", label: "Final Exam" },
  { value: "assignment", label: "Assignment" },
  { value: "project", label: "Project" },
  { value: "quiz", label: "Quiz" },
];

const MARKS_SUBJECTS = [
  { value: "", label: "Select Subject" },
  { value: "Marathi", label: "Marathi" },
  { value: "Hindi", label: "Hindi" },
  { value: "Sanskrit", label: "Sanskrit" },
  { value: "English", label: "English" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "History", label: "History" },
  { value: "Science", label: "Science" },
  { value: "Social-Sci", label: "Social-Sci" },
  { value: "Geography", label: "Geography" },
  { value: "Biology", label: "Biology" },
  { value: "Physics", label: "Physics" },
  { value: "Chemistry", label: "Chemistry" },
  { value: "Other", label: "Other" },
];

const EXAM_NAME_OPTIONS = [
  { value: "", label: "Select Exam Name" },
  { value: "School Exam", label: "School Exam" },
  { value: "College Exam", label: "College Exam" },
  { value: "Competitive Exam", label: "Competitive Exam" },
  { value: "Class Exam", label: "Class Exam" },
  { value: "__other", label: "Other (type manually)" },
];

const ACADEMIC_YEARS = ["2023-24", "2024-25", "2025-26"];

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const MarksFormModal = ({ editMark, onClose, onSuccess }) => {
  const isEdit = !!editMark;
  const queryClient = useQueryClient();

  // Student search state
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const debouncedStudentSearch = useDebounce(studentSearch, 500);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: isEdit
      ? {
        student: editMark.student?.studentId || "",
        subject: editMark.subject,
        examType: editMark.examType,
        examNameChoice: EXAM_NAME_OPTIONS.some(
          (o) => o.value === editMark.examName
        )
          ? editMark.examName
          : "__other",
        customExamName: EXAM_NAME_OPTIONS.some(
          (o) => o.value === editMark.examName
        )
          ? ""
          : editMark.examName,
        marksObtained: editMark.marksObtained,
        totalMarks: editMark.totalMarks,
        examDate: editMark.examDate
          ? editMark.examDate.split("T")[0]
          : "",
        academicYear: editMark.academicYear,
        remarks: editMark.remarks || "",
      }
      : {
        academicYear: "2024-25",
        examNameChoice: "",
        customExamName: "",
      },
  });

  const examNameChoice = watch("examNameChoice");

  // Initialize selected student for edit mode
  useEffect(() => {
    if (isEdit && editMark.student) {
      setSelectedStudent({
        _id: editMark.student._id,
        name: editMark.student.name,
        studentId: editMark.student.studentId,
        class: editMark.student.class,
        batch: editMark.student.batch,
      });
    }
  }, [isEdit, editMark]);

  // Search students API call
  useEffect(() => {
    if (debouncedStudentSearch.trim().length < 2) {
      setStudentResults([]);
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    studentsAPI
      .getAll({
        search: debouncedStudentSearch,
        page: 1,
        limit: 10,
      })
      .then((res) => {
        const students = res?.data?.students || res?.students || [];
        setStudentResults(students);
        setShowDropdown(true);
        setSearchLoading(false);
      })
      .catch(() => {
        setSearchLoading(false);
        setStudentResults([]);
      });
  }, [debouncedStudentSearch]);

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setValue("student", student.studentId, { shouldValidate: true });
    setStudentSearch("");
    setShowDropdown(false);
  };

  const handleStudentClear = () => {
    setSelectedStudent(null);
    setValue("student", "");
    setStudentSearch("");
  };

  const addMutation = useMutation({
    mutationFn: marksAPI.create,
    onSuccess: () => {
      toast.success("Marks added successfully!");
      queryClient.invalidateQueries({ queryKey: ["marks"] });
      reset();
      onSuccess && onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to add!");
    },
  });

  const editMutation = useMutation({
    mutationFn: (data) => marksAPI.update(editMark._id, data),
    onSuccess: () => {
      toast.success("Marks updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["marks"] });
      reset();
      onSuccess && onSuccess();
    },
    onError: () => {
      toast.error("Update failed");
    },
  });

  const submitHandler = (data) => {
    const finalExamName =
      data.examNameChoice === "__other"
        ? data.customExamName
        : data.examNameChoice;

    const payload = {
      ...data,
      examName: finalExamName,
    };
    delete payload.examNameChoice;
    delete payload.customExamName;

    if (isEdit) {
      editMutation.mutate(payload);
    } else {
      addMutation.mutate(payload);
    }
  };

  const handleExamNameSelect = (e) => {
    const value = e.target.value;
    setValue("examNameChoice", value, { shouldValidate: true });
    if (value !== "__other") {
      setValue("customExamName", "", { shouldValidate: true });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Edit Marks" : "Add Marks"}
          </h2>
          <button
            className="text-2xl text-gray-400 hover:text-gray-600"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit(submitHandler)}
          className="space-y-4"
          autoComplete="off"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Search */}
            <div className="md:col-span-2">
              <label className="form-label font-medium text-sm">
                Student <span className="text-red-500">*</span>
              </label>

              {selectedStudent ? (
                <div className="flex items-center justify-between p-3 border border-green-300 bg-green-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {selectedStudent.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      ID: {selectedStudent.studentId} | Class:{" "}
                      {selectedStudent.class} | Batch: {selectedStudent.batch}
                    </div>
                  </div>
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={handleStudentClear}
                      className="text-red-500 hover:text-red-700"
                      title="Clear selection"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or student ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="input pl-10 w-full"
                      disabled={isEdit}
                    />
                  </div>

                  {showDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchLoading ? (
                        <div className="p-4 text-center text-gray-500">
                          Searching...
                        </div>
                      ) : studentResults.length > 0 ? (
                        studentResults.map((student) => (
                          <button
                            key={student._id}
                            type="button"
                            onClick={() => handleStudentSelect(student)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-gray-900">
                              {student.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              ID: {student.studentId} | Class: {student.class}{" "}
                              | Batch: {student.batch}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No students found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Hidden input for form validation */}
              <input
                type="hidden"
                {...register("student", { required: "Student is required" })}
              />
              {errors.student && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.student.message}
                </p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="form-label font-medium text-sm">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                {...register("subject", { required: "Subject required" })}
                className="border rounded px-2 py-1 w-full"
              >
                {MARKS_SUBJECTS.map((s) => (
                  <option value={s.value} key={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {errors.subject && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.subject.message}
                </p>
              )}
            </div>

            {/* Exam Type */}
            <div>
              <label className="form-label font-medium text-sm">
                Exam Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register("examType", { required: "Exam Type required" })}
                className="border rounded px-2 py-1 w-full"
              >
                <option value="">Select...</option>
                {MARKS_EXAM_TYPES.map((e) => (
                  <option value={e.value} key={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
              {errors.examType && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.examType.message}
                </p>
              )}
            </div>

            {/* Exam Name */}
            <div className="md:col-span-2">
              <label className="form-label font-medium text-sm">
                Exam Name <span className="text-red-500">*</span>
              </label>
              <select
                {...register("examNameChoice", {
                  required: "Exam Name required",
                })}
                className="border rounded px-2 py-1 w-full"
                onChange={handleExamNameSelect}
              >
                {EXAM_NAME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {examNameChoice === "__other" && (
                <input
                  className="input mt-2"
                  {...register("customExamName", {
                    required: "Exam Name required",
                  })}
                  placeholder="Enter custom exam name"
                  type="text"
                />
              )}
              {(errors.examNameChoice || errors.customExamName) && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.examNameChoice?.message ||
                    errors.customExamName?.message}
                </p>
              )}
            </div>

            {/* Marks Obtained */}
            <div>
              <label className="form-label font-medium text-sm">
                Marks Obtained <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register("marksObtained", {
                  required: "Marks obtained required",
                })}
                className="input"
                min={0}
              />
              {errors.marksObtained && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.marksObtained.message}
                </p>
              )}
            </div>

            {/* Total Marks */}
            <div>
              <label className="form-label font-medium text-sm">
                Total Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register("totalMarks", {
                  required: "Total marks required",
                })}
                className="input"
                min={1}
              />
              {errors.totalMarks && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.totalMarks.message}
                </p>
              )}
            </div>

            {/* Exam Date */}
            <div>
              <label className="form-label font-medium text-sm">
                Exam Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register("examDate", { required: "Exam Date required" })}
                className="input"
              />
              {errors.examDate && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.examDate.message}
                </p>
              )}
            </div>

            {/* Academic Year */}
            <div>
              <label className="form-label font-medium text-sm">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                {...register("academicYear", {
                  required: "Academic Year required",
                })}
                className="border rounded px-2 py-1 w-full"
              >
                {ACADEMIC_YEARS.map((y) => (
                  <option value={y} key={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Remarks */}
            <div className="md:col-span-2">
              <label className="form-label font-medium text-sm">Remarks</label>
              <textarea
                {...register("remarks")}
                className="textarea"
                rows={2}
                placeholder="Any remarks..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={addMutation.isLoading || editMutation.isLoading}
            >
              {addMutation.isLoading || editMutation.isLoading ? (
                <LoadingSpinner size="sm" />
              ) : isEdit ? (
                "Update"
              ) : (
                "Add"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarksFormModal;
