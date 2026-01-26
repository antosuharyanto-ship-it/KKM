import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSellerAuth } from '../contexts/SellerAuthContext';

interface ProtectedSellerRouteProps {
    children: React.ReactNode;
}

const ProtectedSellerRoute: React.FC<ProtectedSellerRouteProps> = ({ children }) => {
    const { isAuthenticated, loading } = useSellerAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/seller/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedSellerRoute;
