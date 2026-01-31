// src/components/Reports/StudentSelector.jsx
import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import axios from "axios"; // ✅ Import axios directly
import toast from "react-hot-toast";

const StudentSelector = ({ selectedStudent, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        if (searchQuery.trim()) {
            const filtered = students.filter(
                (student) =>
                    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    student.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredStudents(filtered);
            setShowDropdown(true);
        } else {
            setFilteredStudents([]);
            setShowDropdown(false);
        }
    }, [searchQuery, students]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            // ✅ Direct API call
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:8080/api/students", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: {
                    limit: 1000,
                },
            });

            // ✅ Handle response properly
            if (response.data && response.data.students) {
                setStudents(response.data.students);
            } else if (Array.isArray(response.data)) {
                setStudents(response.data);
            } else {
                console.error("Unexpected response format:", response.data);
                setStudents([]);
            }
        } catch (error) {
            console.error("Failed to fetch students:", error);
            toast.error("Failed to load students");
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (student) => {
        setSearchQuery(student.name);
        setShowDropdown(false);
        onSelect(student);
    };

    const handleClear = () => {
        setSearchQuery("");
        setShowDropdown(false);
        onSelect(null);
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                {/* Search Input */}
                <div className="flex-1 relative">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => {
                                if (searchQuery.trim() && filteredStudents.length > 0) {
                                    setShowDropdown(true);
                                }
                            }}
                            placeholder="Search by name, student ID, or roll number..."
                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={handleClear}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    {/* Dropdown */}
                    {showDropdown && filteredStudents.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                            {filteredStudents.map((student) => (
                                <button
                                    key={student._id}
                                    onClick={() => handleSelect(student)}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{student.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                ID: {student.studentId} | Roll: {student.rollNumber} | Class:{" "}
                                                {student.class}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {showDropdown && searchQuery && filteredStudents.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                            <p className="text-sm text-gray-500 text-center">No students found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Selected Student Card */}
            {selectedStudent && (
                <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-900">{selectedStudent.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                ID: {selectedStudent.studentId} | Roll: {selectedStudent.rollNumber} |
                                Class: {selectedStudent.class} | Block: {selectedStudent.block}
                            </p>
                        </div>
                        <button
                            onClick={handleClear}
                            className="text-gray-400 hover:text-gray-600"
                            title="Clear selection"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="mt-2 text-sm text-gray-500">Loading students...</div>
            )}
        </div>
    );
};

export default StudentSelector;
