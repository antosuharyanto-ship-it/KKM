import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSellerAuth } from '../contexts/SellerAuthContext';
import { FaGoogle, FaStore } from 'react-icons/fa';

const SellerLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, isAuthenticated } = useSellerAuth();

    // Handle token from OAuth callback
    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            localStorage.setItem('seller_token', token);
            navigate('/seller/dashboard', { replace: true });
            window.location.reload(); // Reload to trigger SellerAuthContext
        }
    }, [searchParams, navigate]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/seller/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const error = searchParams.get('error');
    const errorMessages: Record<string, string> = {
        access_denied: 'Access denied. Your email is not in the seller allowlist. Please contact an organizer.',
        auth_failed: 'Authentication failed. Please try again.',
        server_error: 'Server error. Please try again later.',
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
            <div className="max-w-md w-full">
                {/* Logo/Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                        <FaStore className="text-white text-2xl" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Seller Dashboard</h1>
                    <p className="text-gray-600">KKM Marketplace</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
                        Welcome Back
                    </h2>
                    <p className="text-gray-600 mb-6 text-center">
                        Sign in to manage your products and orders
                    </p>

                    {/* Error Messages */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800 text-sm">
                                {errorMessages[error] || 'An error occurred. Please try again.'}
                            </p>
                        </div>
                    )}

                    {/* Google Login Button */}
                    <button
                        onClick={login}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-6 rounded-lg border-2 border-gray-300 hover:border-green-600 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                        <FaGoogle className="text-xl text-red-500" />
                        <span>Continue with Google</span>
                    </button>

                    {/* Info Text */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-900 text-sm">
                            <strong>Note:</strong> Access is restricted to approved sellers only. If you're not approved yet, please contact an organizer to add your email to the allowlist.
                        </p>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="mt-6 text-center">
                    <p className="text-gray-600 text-sm">
                        Need help?{' '}
                        <a
                            href="mailto:support@kkm.com"
                            className="text-green-600 hover:text-green-700 font-medium underline"
                        >
                            Contact Support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SellerLoginPage;
