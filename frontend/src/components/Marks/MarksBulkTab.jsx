// src/components/Marks/MarksBulkTab.jsx
import React, { useState } from "react";
import { UploadCloud, Info, Download, FileSpreadsheet } from "lucide-react";
import BulkUploadModal from "./BulkUploadModal";

const MarksBulkTab = () => {
  const [showBulk, setShowBulk] = useState(false);

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary-100">
            <FileSpreadsheet className="h-6 w-6 text-primary-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Upload</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload CSV with student marks (student column should be studentId code).
            </p>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={() => setShowBulk(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <UploadCloud className="h-4 w-4" />
            Open Bulk Upload
          </button>
        </div>
      </div>

      {/* Professional Instructions */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-100">
            <Info className="h-5 w-5 text-amber-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">CSV Upload Instructions</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-200">
                <FileSpreadsheet className="h-5 w-5 text-blue-800" />
              </div>
              <h4 className="font-bold text-blue-900">Required Fields</h4>
            </div>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>student</strong> - studentId code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>examType</strong> - exam type (weekly_test, monthly_test, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>examName</strong> - exam name/description</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>subject</strong> - subject name</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>marksObtained</strong> - marks obtained by student</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>totalMarks</strong> - total marks for exam</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>examDate</strong> - exam date (ISO or parsable date)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>academicYear</strong> - academic year (e.g. 2024-25)</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-200">
                <Download className="h-5 w-5 text-green-800" />
              </div>
              <h4 className="font-bold text-green-900">Quick Start</h4>
            </div>
            <div className="space-y-3 text-sm text-green-800">
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="font-medium mb-2">Sample CSV Format:</p>
                <code className="text-xs bg-gray-100 p-2 rounded block">
                  student,examType,examName,subject,marksObtained,totalMarks,examDate,academicYear<br/>
                  STU001,weekly_test,Math Test 1,Mathematics,85,100,2024-12-15,2024-25<br/>
                  STU002,weekly_test,Math Test 1,Mathematics,78,100,2024-12-15,2024-25
                </code>
              </div>
              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 transition-colors duration-200">
                <Download className="h-4 w-4" />
                Download Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-200">
            <Info className="h-5 w-5 text-amber-800" />
          </div>
          <div>
            <h4 className="font-bold text-amber-900 mb-2">Important Tips</h4>
            <ul className="space-y-1 text-sm text-amber-800">
              <li>• Ensure studentId codes match existing students in the system</li>
              <li>• Use consistent exam types and subject names</li>
              <li>• Date format should be YYYY-MM-DD or any parsable date format</li>
              <li>• Academic year should match the current academic year format</li>
              <li>• Review the uploaded data before final confirmation</li>
            </ul>
          </div>
        </div>
      </div>

      {showBulk && <BulkUploadModal onClose={() => setShowBulk(false)} />}
    </div>
  );
};

export default MarksBulkTab;
