import React from 'react';
import { LogIn, LogOut, Search, Clock, Shield } from 'lucide-react';

const GateEntry = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gate Entry Management</h1>
                    <p className="mt-1 text-sm text-gray-600">Watchman Dashboard - Monitor Entries & Exits</p>
                </div>
                <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    <Shield className="w-4 h-4" />
                    <span>On Duty</span>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button className="flex flex-col items-center justify-center p-8 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-colors group">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-white group-hover:scale-110 transition-all">
                        <LogIn className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-green-800">Log Entry (In)</h3>
                    <p className="text-sm text-green-600 mt-1">Record student or visitor arrival</p>
                </button>

                <button className="flex flex-col items-center justify-center p-8 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors group">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-white group-hover:scale-110 transition-all">
                        <LogOut className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-red-800">Log Exit (Out)</h3>
                    <p className="text-sm text-red-600 mt-1">Record student leaving campus</p>
                </button>
            </div>

            {/* Recent Activity Placeholder */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-gray-400" />
                    Recent Activity
                </h3>
                <div className="text-center py-8 text-gray-500">
                    <p>No recent activity recorded.</p>
                </div>
            </div>
        </div>
    );
};

export default GateEntry;
