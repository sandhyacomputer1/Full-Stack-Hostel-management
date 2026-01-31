// src/components/Marks/MarksBulkTab.jsx
import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { marksAPI, studentsAPI } from "../../services/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Upload, FileUp, Download, Search, X, Info } from "lucide-react";

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

const MarksBulkTab = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([
    {
      studentSearch: "",
      selectedStudent: null,
      subject: "",
      examType: "",
      examNameChoice: "",
      customExamName: "",
      marksObtained: "",
      totalMarks: "",
      examDate: "",
      academicYear: "2024-25",
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultDetails, setResultDetails] = useState(null);
  const [studentSearchResults, setStudentSearchResults] = useState({});
  const [activeSearchRow, setActiveSearchRow] = useState(null);
  const [searchLoading, setSearchLoading] = useState({});

  const bulkMutation = useMutation({
    mutationFn: marksAPI.bulkCreate,
    onSuccess: (res) => {
      const errors = res?.results?.filter((r) => !r.success) ?? [];
      setResultDetails(res.results || null);

      if (errors.length === 0) {
        toast.success("All marks uploaded successfully!");
        setRows([{
          studentSearch: "",
          selectedStudent: null,
          subject: "",
          examType: "",
          examNameChoice: "",
          customExamName: "",
          marksObtained: "",
          totalMarks: "",
          examDate: "",
          academicYear: "2024-25",
        }]);
      } else {
        toast.warning(`Uploaded with ${errors.length} error(s)`);
      }

      queryClient.invalidateQueries({ queryKey: ["marks"] });
      setIsSubmitting(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Bulk upload failed");
      setIsSubmitting(false);
    },
  });

  const handleStudentSearch = (idx, searchTerm) => {
    handleField(idx, "studentSearch", searchTerm);

    if (searchTerm.trim().length < 2) {
      setStudentSearchResults((prev) => ({ ...prev, [idx]: [] }));
      setActiveSearchRow(null);
      return;
    }

    setSearchLoading((prev) => ({ ...prev, [idx]: true }));
    setActiveSearchRow(idx);

    setTimeout(() => {
      studentsAPI
        .getAll({
          search: searchTerm,
          page: 1,
          limit: 10,
        })
        .then((res) => {
          const students = res?.data?.students || res?.students || [];
          setStudentSearchResults((prev) => ({ ...prev, [idx]: students }));
          setSearchLoading((prev) => ({ ...prev, [idx]: false }));
        })
        .catch(() => {
          setSearchLoading((prev) => ({ ...prev, [idx]: false }));
          setStudentSearchResults((prev) => ({ ...prev, [idx]: [] }));
        });
    }, 500);
  };

  const handleStudentSelect = (idx, student) => {
    setRows((arr) =>
      arr.map((r, i) =>
        i === idx
          ? {
            ...r,
            selectedStudent: student,
            studentSearch: "",
          }
          : r
      )
    );
    setActiveSearchRow(null);
    setStudentSearchResults((prev) => ({ ...prev, [idx]: [] }));
  };

  const handleStudentClear = (idx) => {
    setRows((arr) =>
      arr.map((r, i) =>
        i === idx
          ? {
            ...r,
            selectedStudent: null,
            studentSearch: "",
          }
          : r
      )
    );
  };

  const handleField = (idx, field, value) => {
    setRows((arr) =>
      arr.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const handleExamNameChange = (idx, value) => {
    setRows((arr) =>
      arr.map((r, i) =>
        i === idx
          ? {
            ...r,
            examNameChoice: value,
            customExamName: value === "__other" ? r.customExamName : "",
          }
          : r
      )
    );
  };

  const addRow = () =>
    setRows([
      ...rows,
      {
        studentSearch: "",
        selectedStudent: null,
        subject: "",
        examType: "",
        examNameChoice: "",
        customExamName: "",
        marksObtained: "",
        totalMarks: "",
        examDate: "",
        academicYear: "2024-25",
      },
    ]);

  const removeRow = (i) => {
    if (rows.length === 1) {
      toast.error("Cannot remove the last row");
      return;
    }
    setRows(rows.filter((_, idx) => idx !== i));
    setStudentSearchResults((prev) => {
      const newResults = { ...prev };
      delete newResults[i];
      return newResults;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const invalidRows = rows.filter((r) => !r.selectedStudent);
    if (invalidRows.length > 0) {
      toast.error("Please select a student for all rows");
      return;
    }

    setIsSubmitting(true);
    setResultDetails(null);

    const payload = rows.map((r) => {
      const finalExamName = r.examNameChoice === "__other"
        ? r.customExamName
        : r.examNameChoice;

      return {
        student: r.selectedStudent.studentId,
        subject: r.subject,
        examType: r.examType,
        examName: finalExamName,
        marksObtained: Number(r.marksObtained),
        totalMarks: Number(r.totalMarks),
        examDate: r.examDate,
        academicYear: r.academicYear,
      };
    });

    bulkMutation.mutate(payload);
  };

  const handleResultHide = () => setResultDetails(null);

  const handleCSVImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          toast.error("CSV file is empty or invalid");
          return;
        }

        const dataLines = lines.slice(1);

        const importedRows = dataLines.map((line) => {
          const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

          return {
            studentSearch: values[0] || "",
            selectedStudent: null,
            subject: values[1] || "",
            examType: values[2] || "",
            examNameChoice: values[3] || "",
            customExamName: "",
            marksObtained: values[4] || "",
            totalMarks: values[5] || "",
            examDate: values[6] || "",
            academicYear: values[7] || "2024-25",
          };
        });

        if (importedRows.length > 0) {
          setRows(importedRows);
          toast.success(`Imported ${importedRows.length} rows. Please search and select students.`);
        }
      } catch (error) {
        toast.error("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const headers = [
      "studentIdOrName",
      "subject",
      "examType",
      "examName",
      "marksObtained",
      "totalMarks",
      "examDate",
      "academicYear",
    ];

    const exampleRow = [
      "STU20250123",
      "Mathematics",
      "mid_term",
      "Mid Term Exam",
      "85",
      "100",
      "2024-12-01",
      "2024-25",
    ];

    const csvContent = headers.join(",") + "\n" + exampleRow.join(",");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marks_bulk_upload_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded!");
  };

  const resetAllRows = () => {
    setRows([{
      studentSearch: "",
      selectedStudent: null,
      subject: "",
      examType: "",
      examNameChoice: "",
      customExamName: "",
      marksObtained: "",
      totalMarks: "",
      examDate: "",
      academicYear: "2024-25",
    }]);
    setResultDetails(null);
    toast.info("Form reset");
  };

  return (
    <div className="space-y-4">
      {/* Header with Actions - NO BUTTON TO OPEN, TABLE IS ALREADY HERE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        <div className="p-5 border-b bg-gradient-to-r from-blue-50 via-white to-white rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bulk Marks Upload</h2>
              <p className="mt-1 text-sm text-gray-600">
                Add marks for multiple students at once
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={downloadTemplate}
                className="btn btn-outline btn-sm flex items-center bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 active:scale-[0.98] transition"
              >
                <Download className="h-4 w-4 mr-1" />
                Template
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline btn-sm flex items-center bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 active:scale-[0.98] transition"
              >
                <FileUp className="h-4 w-4 mr-1" />
                Import CSV
              </button>
              <button
                type="button"
                onClick={addRow}
                className="btn btn-sm flex items-center bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm hover:shadow active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-white border-b">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Quick Guide:</p>
              <ul className="space-y-1 text-xs list-disc list-inside">
                <li>Search student by name/ID → Select from dropdown → Fill marks details</li>
                <li>Or import CSV (download template first) → Then search & select each student</li>
                <li>Click "Upload All" when ready to submit all rows</li>
              </ul>
            </div>
          </div>
        </div>

        {/* THE TABLE IS ALREADY VISIBLE - NO BUTTON NEEDED TO OPEN IT */}
        <form onSubmit={handleSubmit}>
          <div className="overflow-x-auto">
            <div style={{ maxHeight: '680px', overflowY: 'auto' }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap uppercase tracking-wide">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap uppercase tracking-wide" style={{ minWidth: '250px' }}>
                      Student *
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap uppercase tracking-wide" style={{ minWidth: '150px' }}>
                      Subject *
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap uppercase tracking-wide" style={{ minWidth: '150px' }}>
                      Exam Type *
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap uppercase tracking-wide" style={{ minWidth: '180px' }}>
                      Exam Name *
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap uppercase tracking-wide">
                      Marks *
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap uppercase tracking-wide">
                      Total *
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap uppercase tracking-wide" style={{ minWidth: '140px' }}>
                      Date *
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap uppercase tracking-wide">
                      Year *
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap uppercase tracking-wide">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isOtherExam = row.examNameChoice === "__other";
                    const hasStudentResults = studentSearchResults[idx]?.length > 0;

                    return (
                      <tr key={idx} className="border-b border-gray-100 even:bg-gray-50/60 hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                          {idx + 1}
                        </td>

                        {/* Student Search */}
                        <td className="px-4 py-3 relative">
                          {row.selectedStudent ? (
                            <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 shadow-sm ring-1 ring-emerald-100">
                              <div className="flex-1">
                                <div className="font-semibold text-sm text-gray-900">
                                  {row.selectedStudent.name}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5">
                                  ID: {row.selectedStudent.studentId} • Class: {row.selectedStudent.class}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStudentClear(idx)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 rounded transition"
                                title="Clear student"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                className="input input-sm w-full pl-9 border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                                type="text"
                                placeholder="Search by name or ID..."
                                value={row.studentSearch}
                                onChange={(e) => handleStudentSearch(idx, e.target.value)}
                                required={!row.selectedStudent}
                              />

                              {activeSearchRow === idx && hasStudentResults && (
                                <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-2xl max-h-96 overflow-y-auto overscroll-contain">
                                  {searchLoading[idx] ? (
                                    <div className="p-4 text-center text-gray-500">
                                      Searching...
                                    </div>
                                  ) : (
                                    studentSearchResults[idx].map((student) => (
                                      <button
                                        key={student._id}
                                        type="button"
                                        onClick={() => handleStudentSelect(idx, student)}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50/70 focus:bg-blue-50/70 border-b border-gray-100 last:border-0 transition"
                                      >
                                        <div className="font-semibold text-sm text-gray-900">
                                          {student.name}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-0.5">
                                          {student.studentId} • {student.class} • {student.batch}
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Subject */}
                        <td className="px-4 py-3">
                          <select
                            className="input input-sm w-full border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                            value={row.subject}
                            onChange={(e) => handleField(idx, "subject", e.target.value)}
                            required
                          >
                            {MARKS_SUBJECTS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Exam Type */}
                        <td className="px-4 py-3">
                          <select
                            className="input input-sm w-full border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                            value={row.examType}
                            onChange={(e) => handleField(idx, "examType", e.target.value)}
                            required
                          >
                            <option value="">Select...</option>
                            {MARKS_EXAM_TYPES.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Exam Name */}
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            <select
                              className="input input-sm w-full border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                              value={row.examNameChoice}
                              onChange={(e) => handleExamNameChange(idx, e.target.value)}
                              required={!isOtherExam}
                            >
                              {EXAM_NAME_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            {isOtherExam && (
                              <input
                                className="input input-sm w-full border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                                type="text"
                                placeholder="Enter custom name"
                                value={row.customExamName}
                                onChange={(e) =>
                                  handleField(idx, "customExamName", e.target.value)
                                }
                                required
                              />
                            )}
                          </div>
                        </td>

                        {/* Marks */}
                        <td className="px-4 py-3">
                          <input
                            className="input input-sm w-20 border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                            type="number"
                            min={0}
                            placeholder="0"
                            value={row.marksObtained}
                            onChange={(e) =>
                              handleField(idx, "marksObtained", e.target.value)
                            }
                            required
                          />
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3">
                          <input
                            className="input input-sm w-20 border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                            type="number"
                            min={1}
                            placeholder="100"
                            value={row.totalMarks}
                            onChange={(e) => handleField(idx, "totalMarks", e.target.value)}
                            required
                          />
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          <input
                            className="input input-sm border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                            type="date"
                            value={row.examDate}
                            onChange={(e) => handleField(idx, "examDate", e.target.value)}
                            required
                          />
                        </td>

                        {/* Year */}
                        <td className="px-4 py-3">
                          <select
                            className="input input-sm w-24 border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                            value={row.academicYear}
                            onChange={(e) =>
                              handleField(idx, "academicYear", e.target.value)
                            }
                            required
                          >
                            {ACADEMIC_YEARS.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Remove */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition disabled:opacity-40 active:scale-[0.98]"
                            onClick={() => removeRow(idx)}
                            disabled={rows.length === 1 || isSubmitting}
                            title="Remove row"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t bg-gray-50/60 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold border border-blue-100">
              {rows.length} row{rows.length !== 1 ? 's' : ''} ready to upload
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-outline btn-md border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-100 active:scale-[0.98] transition"
                onClick={resetAllRows}
                disabled={isSubmitting}
              >
                Reset All
              </button>
              <button
                type="submit"
                className="btn btn-md flex items-center bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm hover:shadow active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                disabled={isSubmitting}
              >
                <Upload className="w-5 h-5 mr-2" />
                {isSubmitting ? "Uploading..." : `Upload ${rows.length} Record${rows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </form>

        {/* Results */}
        {resultDetails && (
          <div className="border-t px-6 py-4 bg-yellow-50">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900">Upload Results</h4>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleResultHide}
              >
                Hide
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {resultDetails.map((r, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-sm ${r.success
                      ? "bg-green-100 text-green-900 border border-green-300"
                      : "bg-red-100 text-red-900 border border-red-300"
                    }`}
                >
                  <span className="font-bold">Row {r.index + 1}</span> ({r.student}):{" "}
                  {r.success ? "✓ Success" : `✗ ${r.error}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarksBulkTab;
