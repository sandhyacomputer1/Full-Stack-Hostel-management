import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../contexts/ParentAuthContext';
import { useQuery } from '@tanstack/react-query';
import { parentAPI } from '../../services/api';
import {
    User,
    DollarSign,
    LogOut,
    Calendar,
    Wallet,
    ArrowRight,
    Building2,
    BookOpen,
    Utensils,
    Clock,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    XCircle,
    AlertCircle,
} from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const ParentDashboard = () => {
    const { parent, logout } = useParentAuth();
    const navigate = useNavigate();
    const [isPageLoaded, setIsPageLoaded] = useState(false);

    // Page load animation
    useEffect(() => {
        setIsPageLoaded(true);
    }, []);

    // Fetch dashboard data
    const { data, isLoading, error } = useQuery({
        queryKey: ['parentDashboard'],
        queryFn: async () => {
            const response = await parentAPI.getDashboard();
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
                    <p className="text-red-600">Failed to load dashboard</p>
                    <button
                        onClick={() => navigate('/parent/login')}
                        className="mt-4 text-indigo-600 hover:text-indigo-700"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    const children = data?.children || [];
    const hostelName = children[0]?.hostel || 'Hostel';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header/Navbar */}
            <div className="bg-white shadow-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-3 rounded-xl shadow-lg">
                                <Building2 className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {hostelName}
                                </h1>
                                <p className="text-sm text-gray-600">Parent Portal</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900">
                                    {children[0]?.father?.name || children[0]?.mother?.name || 'Parent'}
                                </p>
                                <p className="text-xs text-gray-500">{parent?.phone}</p>
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
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Children List */}
                {children.map((child) => (
                    <div key={child.id} className="mb-8">
                        {/* Student Header Card */}
                        <div className={`bg-white rounded-xl shadow-lg overflow-hidden mb-6 transform transition-all duration-700 ease-out hover:shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-1 ${
                            isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                        style={{
                            animationDelay: '0.2s'
                        }}>
                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-6">
                                <div className="flex items-center gap-4">
                                    {/* Student Photo */}
                                    <div className="flex-shrink-0">
                                        {child.photo ? (
                                            <img
                                                src={child.photo}
                                                alt={child.name}
                                                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center">
                                                <User className="h-10 w-10 text-indigo-600" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Student Info */}
                                    <div className="flex-1 text-white">
                                        <h2 className="text-2xl font-bold">{child.name}</h2>
                                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-indigo-100">
                                            <span>ID: {child.studentId}</span>
                                            <span>•</span>
                                            <span>Class: {child.class}</span>
                                            <span>•</span>
                                            <span>Batch: {child.batch}</span>
                                            {child.room && (
                                                <>
                                                    <span>•</span>
                                                    <span>Room: {child.room}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Current Status */}
                                    <div className="hidden md:block">
                                        <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                                            <p className="text-xs text-indigo-100 mb-1">Status</p>
                                            <div className="flex items-center gap-2">
                                                {child.currentState === 'IN' ? (
                                                    <>
                                                        <CheckCircle className="h-5 w-5 text-green-300" />
                                                        <span className="font-semibold text-white">In Hostel</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle className="h-5 w-5 text-yellow-300" />
                                                        <span className="font-semibold text-white">Out</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            {/* Fees Card */}
                            <div className={`bg-white rounded-xl shadow-lg p-6 transform transition-all duration-700 ease-out hover:shadow-xl hover:shadow-red-500/20 hover:-translate-y-1 hover:scale-105 ${
                                isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                            style={{
                                animationDelay: '0.3s'
                            }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-red-100 p-3 rounded-lg">
                                        <DollarSign className="h-6 w-6 text-red-600" />
                                    </div>
                                    {(child.fees?.pending || 0) > 0 ? (
                                        <TrendingUp className="h-5 w-5 text-red-500" />
                                    ) : (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    )}
                                </div>
                                <h3 className="text-sm font-medium text-gray-600 mb-1">Fee Status</h3>
                                <p className="text-2xl font-bold text-gray-900 mb-2">
                                    ₹{(child.fees?.pending || 0).toLocaleString()}
                                </p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Pending</span>
                                    <span className="font-medium text-green-600">
                                        ₹{(child.fees?.paid || 0).toLocaleString()} Paid
                                    </span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">Total Fees</span>
                                        <span className="font-semibold">₹{(child.fees?.total || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bank Balance Card */}
                            <div className={`bg-white rounded-xl shadow-lg p-6 transform transition-all duration-700 ease-out hover:shadow-xl hover:shadow-green-500/20 hover:-translate-y-1 hover:scale-105 ${
                                isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                            style={{
                                animationDelay: '0.4s'
                            }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-green-100 p-3 rounded-lg">
                                        <Wallet className="h-6 w-6 text-green-600" />
                                    </div>
                                    {(child.bankBalance || 0) < 500 ? (
                                        <TrendingDown className="h-5 w-5 text-orange-500" />
                                    ) : (
                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                    )}
                                </div>
                                <h3 className="text-sm font-medium text-gray-600 mb-1">Bank Balance</h3>
                                <p className="text-2xl font-bold text-gray-900 mb-2">
                                    ₹{(child.bankBalance || 0).toLocaleString()}
                                </p>
                                <div className="text-xs text-gray-500">
                                    {(child.bankBalance || 0) < 500 ? (
                                        <span className="text-orange-600 font-medium">⚠️ Low Balance</span>
                                    ) : (
                                        <span className="text-green-600 font-medium">✓ Sufficient</span>
                                    )}
                                </div>
                            </div>

                            {/* Attendance Card */}
                            <div className={`bg-white rounded-xl shadow-lg p-6 transform transition-all duration-700 ease-out hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 hover:scale-105 ${
                                isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                            style={{
                                animationDelay: '0.5s'
                            }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-blue-100 p-3 rounded-lg">
                                        <Calendar className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <CheckCircle className="h-5 w-5 text-blue-500" />
                                </div>
                                <h3 className="text-sm font-medium text-gray-600 mb-1">Attendance</h3>
                                <p className="text-2xl font-bold text-gray-900 mb-2">
                                    {child.attendance?.thisMonth || 0} Days
                                </p>
                                <div className="text-xs text-gray-500">This Month</div>
                            </div>

                            {/* Mess Card */}
                            <div className={`bg-white rounded-xl shadow-lg p-6 transform transition-all duration-700 ease-out hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-1 hover:scale-105 ${
                                isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                            style={{
                                animationDelay: '0.6s'
                            }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-orange-100 p-3 rounded-lg">
                                        <Utensils className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <CheckCircle className="h-5 w-5 text-orange-500" />
                                </div>
                                <h3 className="text-sm font-medium text-gray-600 mb-1">Mess Meals</h3>
                                <p className="text-2xl font-bold text-gray-900 mb-2">
                                    {child.mess?.last7Days || 0} Meals
                                </p>
                                <div className="text-xs text-gray-500">Last 7 Days</div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Recent Gate Entries */}
                            <div className={`bg-white rounded-xl shadow-lg p-6 transform transition-all duration-700 ease-out hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 ${
                                isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                            style={{
                                animationDelay: '0.7s'
                            }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Recent Gate Entries</h3>
                                    <Clock className="h-5 w-5 text-gray-400" />
                                </div>
                                <div className="space-y-3">
                                    {child.recentGateEntries && child.recentGateEntries.length > 0 ? (
                                        child.recentGateEntries.map((entry, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${entry.type === 'IN' ? 'bg-green-500' : 'bg-orange-500'
                                                            }`}
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {entry.type === 'IN' ? 'Entered Hostel' : 'Left Hostel'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(entry.date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-medium text-gray-600">
                                                    {new Date(entry.time).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 text-center py-4">No recent entries</p>
                                    )}
                                </div>
                            </div>

                            {/* Latest Marks */}
                            <div className={`bg-white rounded-xl shadow-lg p-6 transform transition-all duration-700 ease-out hover:shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-1 ${
                                isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                            style={{
                                animationDelay: '0.8s'
                            }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Latest Marks</h3>
                                    <BookOpen className="h-5 w-5 text-gray-400" />
                                </div>
                                <div className="space-y-3">
                                    {child.latestMarks && child.latestMarks.length > 0 ? (
                                        child.latestMarks.map((mark, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{mark.subject}</p>
                                                    <p className="text-xs text-gray-500">{mark.examType}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {mark.obtained}/{mark.total}
                                                    </p>
                                                    <p className="text-xs font-medium text-indigo-600">{mark.grade}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 text-center py-4">No marks available</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* View Details Button */}
                        <div className="mt-6">
                            <button
                                onClick={() => navigate(`/parent/child/${child.id}`)}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-medium rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 hover:scale-105 ${
                                    isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                                }`}
                                style={{
                                    animationDelay: '0.9s'
                                }}
                            >
                                View Complete Details
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {children.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl shadow-md">
                        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No children found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParentDashboard;
