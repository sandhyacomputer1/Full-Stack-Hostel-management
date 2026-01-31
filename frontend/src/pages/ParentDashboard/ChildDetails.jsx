import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { parentAPI } from '../../services/api';
import { useParentAuth } from '../../contexts/ParentAuthContext';
import {
    ArrowLeft,
    User,
    DollarSign,
    Calendar,
    Wallet,
    Building2,
    BookOpen,
    Utensils,
    Clock,
    LogOut,
    Phone,
    Mail,
    MapPin,
} from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const ChildDetails = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const { logout } = useParentAuth();

    // Fetch child details
    const { data, isLoading, error } = useQuery({
        queryKey: ['childDetails', studentId],
        queryFn: async () => {
            const response = await parentAPI.getChildDetails(studentId);
            return response.data.data;
        },
    });

    const handleLogout = () => {
        logout();
        navigate('/parent/login');
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-red-600">Failed to load child details</p>
                    <button
                        onClick={() => navigate('/parent/dashboard')}
                        className="mt-4 text-indigo-600 hover:text-indigo-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const child = data || {};

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-white shadow-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/parent/dashboard')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="h-6 w-6 text-gray-600" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-3 rounded-xl shadow-lg">
                                    <Building2 className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">Student Details</h1>
                                    <p className="text-sm text-gray-600">{child.assignedHostel?.name || 'Hostel'}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 hover:border-red-700 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Student Profile Card */}
                <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-6 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-1">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-8">
                        <div className="flex items-center gap-6">
                            {child.photo ? (
                                <img
                                    src={child.photo}
                                    alt={child.name}
                                    className="w-28 h-28 rounded-full border-4 border-white shadow-xl object-cover hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl bg-white flex items-center justify-center hover:scale-105 transition-transform duration-300">
                                    <User className="h-14 w-14 text-indigo-600" />
                                </div>
                            )}
                            <div className="flex-1 text-white">
                                <h2 className="text-3xl font-bold mb-2">{child.name}</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-indigo-100">
                                    <div>
                                        <p className="text-xs opacity-75">Student ID</p>
                                        <p className="font-semibold">{child.studentId}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs opacity-75">Class</p>
                                        <p className="font-semibold">{child.class}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs opacity-75">Batch</p>
                                        <p className="font-semibold">{child.batch}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs opacity-75">Status</p>
                                        <p className="font-semibold">{child.status}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Date of Birth:</span>
                                    <span className="font-medium">
                                        {child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Gender:</span>
                                    <span className="font-medium">{child.gender || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Phone:</span>
                                    <span className="font-medium">{child.phone || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Email:</span>
                                    <span className="font-medium">{child.email || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hostel Information</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Building2 className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Hostel:</span>
                                    <span className="font-medium">{child.assignedHostel?.name || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Room:</span>
                                    <span className="font-medium">{child.roomNumber || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Bed:</span>
                                    <span className="font-medium">{child.bedNumber || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Block:</span>
                                    <span className="font-medium">{child.hostelBlock || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <button className="bg-white p-4 rounded-xl shadow-lg hover:shadow-xl hover:shadow-red-500/20 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 text-left">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-3 rounded-lg hover:bg-red-200 transition-colors duration-300">
                                <DollarSign className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">View Fees</p>
                                <p className="font-semibold text-gray-900">Payment History</p>
                            </div>
                        </div>
                    </button>

                    <button className="bg-white p-4 rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 text-left">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-3 rounded-lg hover:bg-blue-200 transition-colors duration-300">
                                <Calendar className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">View Attendance</p>
                                <p className="font-semibold text-gray-900">Full History</p>
                            </div>
                        </div>
                    </button>

                    <button className="bg-white p-4 rounded-xl shadow-lg hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 text-left">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-3 rounded-lg hover:bg-green-200 transition-colors duration-300">
                                <Wallet className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Bank Account</p>
                                <p className="font-semibold text-gray-900">Transactions</p>
                            </div>
                        </div>
                    </button>

                    <button className="bg-white p-4 rounded-xl shadow-lg hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 text-left">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-3 rounded-lg hover:bg-purple-200 transition-colors duration-300">
                                <BookOpen className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Academic Marks</p>
                                <p className="font-semibold text-gray-900">View Results</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Parent Information */}
                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Father's Details</h4>
                            <div className="space-y-2 text-sm">
                                <p>
                                    <span className="text-gray-600">Name:</span>{' '}
                                    <span className="font-medium">{child.father?.name || 'N/A'}</span>
                                </p>
                                <p>
                                    <span className="text-gray-600">Phone:</span>{' '}
                                    <span className="font-medium">{child.father?.phone || 'N/A'}</span>
                                </p>
                                <p>
                                    <span className="text-gray-600">Occupation:</span>{' '}
                                    <span className="font-medium">{child.father?.occupation || 'N/A'}</span>
                                </p>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Mother's Details</h4>
                            <div className="space-y-2 text-sm">
                                <p>
                                    <span className="text-gray-600">Name:</span>{' '}
                                    <span className="font-medium">{child.mother?.name || 'N/A'}</span>
                                </p>
                                <p>
                                    <span className="text-gray-600">Phone:</span>{' '}
                                    <span className="font-medium">{child.mother?.phone || 'N/A'}</span>
                                </p>
                                <p>
                                    <span className="text-gray-600">Occupation:</span>{' '}
                                    <span className="font-medium">{child.mother?.occupation || 'N/A'}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChildDetails;
