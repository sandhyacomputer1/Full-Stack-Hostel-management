import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useParentAuth } from '../../contexts/ParentAuthContext';
import { Shield, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const VerifyOTP = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [canResend, setCanResend] = useState(false);
    const [countdown, setCountdown] = useState(60);

    const { verifyOTP, requestOTP } = useParentAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const phone = location.state?.phone;

    // Redirect if no phone number
    useEffect(() => {
        if (!phone) {
            navigate('/parent/login');
        }
    }, [phone, navigate]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    // Handle OTP input
    const handleOtpChange = (index, value) => {
        if (value.length > 1) return; // Prevent multiple digits

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }

        // Auto-submit when all 6 digits are entered
        if (index === 5 && value) {
            const otpString = newOtp.join('');
            if (otpString.length === 6) {
                handleVerify(otpString);
            }
        }
    };

    // Handle backspace
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    // Verify OTP
    const handleVerify = async (otpString = null) => {
        const otpCode = otpString || otp.join('');

        if (otpCode.length !== 6) {
            return;
        }

        setIsLoading(true);

        try {
            const result = await verifyOTP(phone, otpCode);
            if (result.success) {
                navigate('/parent/dashboard');
            }
        } catch (error) {
            console.error('Verify OTP error:', error);
            // Clear OTP on error
            setOtp(['', '', '', '', '', '']);
            document.getElementById('otp-0')?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    // Resend OTP
    const handleResend = async () => {
        if (!canResend) return;

        setIsLoading(true);
        try {
            await requestOTP(phone);
            setCanResend(false);
            setCountdown(60);
            setOtp(['', '', '', '', '', '']);
            document.getElementById('otp-0')?.focus();
        } catch (error) {
            console.error('Resend OTP error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="bg-indigo-600 p-3 rounded-full">
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">
                        Verify OTP
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Enter the 6-digit code sent to
                    </p>
                    <p className="text-sm font-medium text-indigo-600">
                        {phone}
                    </p>
                </div>

                {/* OTP Form */}
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="space-y-6">
                        {/* OTP Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                                Enter OTP
                            </label>
                            <div className="flex justify-center gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        disabled={isLoading}
                                        autoFocus={index === 0}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Verify Button */}
                        <div>
                            <button
                                onClick={() => handleVerify()}
                                disabled={isLoading || otp.join('').length !== 6}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {isLoading ? (
                                    <LoadingSpinner size="sm" />
                                ) : (
                                    'Verify OTP'
                                )}
                            </button>
                        </div>

                        {/* Resend OTP */}
                        <div className="text-center">
                            {canResend ? (
                                <button
                                    onClick={handleResend}
                                    disabled={isLoading}
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                                >
                                    Resend OTP
                                </button>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    Resend OTP in <span className="font-medium text-indigo-600">{countdown}s</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Back Button */}
                    <div className="mt-6">
                        <button
                            onClick={() => navigate('/parent/login')}
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            disabled={isLoading}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Change Phone Number
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-600">
                    <p>&copy; 2024 Hostel Management System. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTP;
