import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../contexts/ParentAuthContext';
import { Phone, Building2, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const ParentLogin = () => {
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { requestOTP } = useParentAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await requestOTP(phone);
            if (result.success) {
                // Navigate to OTP verification page
                navigate('/parent/verify-otp', { state: { phone } });
            }
        } catch (error) {
            console.error('Request OTP error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-gray-50">
            {/* Left Side - Login Form */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-20">
                <div className="w-full max-w-md">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl font-bold text-gray-800 mb-3">Welcome To Parent Portal</h1>
                        <p className="text-gray-500 text-sm">Login with your registered mobile number</p>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {/* Phone Number Field */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                    Mobile Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="block w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white hover:border-blue-300"
                                        placeholder="Enter your mobile number"
                                        pattern="[0-9]{10}"
                                        title="Please enter a valid 10-digit mobile number"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Enter the mobile number registered with your child's account
                                </p>
                            </div>

                            {/* Submit Button */}
                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md"
                                >
                                    {isLoading ? (
                                        <LoadingSpinner />
                                    ) : (
                                        'Send OTP'
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Back to Staff Login */}
                        <div className="mt-6">
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-all duration-200"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Staff Login
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-xs text-black-400">
                        <p className="opacity-75">&copy; {new Date().getFullYear()} Hostel Management System. All rights reserved.</p>
                        <p className="mt-1 opacity-75">Developed By <br/> <strong className='text-blue-700'> Sandhya SoftTech Pvt Ltd</strong></p>
                    </div>
                </div>
            </div>

            {/* Right Side - Illustration */}
            <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 items-center justify-center p-12 text-white">
                <div className="max-w-md text-center">
                    <Building2 className="h-16 w-16 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold mb-4">Parent Portal</h2>
                    <p className="text-blue-100">Stay connected with your ward's hostel activities and updates</p>
                    <div className="mt-12 flex justify-center space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full opacity-50"></div>
                        <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                        <div className="w-2 h-2 bg-blue-200 rounded-full opacity-50"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParentLogin;
