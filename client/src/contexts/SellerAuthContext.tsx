import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface Seller {
    seller_id: string;
    email: string;
    full_name: string;
    phone: string;
    whatsapp?: string;
    address?: string;
    bank_account?: string;
    // Shipping Origin
    address_province?: string;
    address_city?: string;
    address_subdistrict?: string;
    address_postal_code?: string;
    shipping_origin_id?: string;

    status: string;
    created_at: string;
    last_login?: string;
    buyerFeePercent?: string;
    sellerFeePercent?: string;
}

interface SellerAuthContextType {
    seller: Seller | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
    updateProfile: (data: Partial<Seller>) => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const SellerAuthContext = createContext<SellerAuthContextType | undefined>(undefined);

interface SellerAuthProviderProps {
    children: ReactNode;
}

export const SellerAuthProvider: React.FC<SellerAuthProviderProps> = ({ children }) => {
    const [seller, setSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const isAuthenticated = !!seller;

    // Fetch seller profile on mount if token exists
    useEffect(() => {
        // Check for token in URL (from OAuth redirect)
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');

        if (urlToken) {
            // Save to local storage
            localStorage.setItem('seller_token', urlToken);

            // Clear URL
            window.history.replaceState({}, document.title, window.location.pathname);

            fetchSellerProfile(urlToken);
        } else {
            const token = localStorage.getItem('seller_token');
            if (token) {
                fetchSellerProfile(token);
            } else {
                setLoading(false);
            }
        }
    }, []);

    const fetchSellerProfile = async (token: string) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/seller/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success) {
                setSeller(response.data.seller);
            } else {
                // Token invalid, clear it
                localStorage.removeItem('seller_token');
            }
        } catch (error) {
            console.error('[SellerAuth] Failed to fetch profile:', error);
            localStorage.removeItem('seller_token');
        } finally {
            setLoading(false);
        }
    };

    const login = () => {
        // Redirect to Google OAuth
        window.location.href = `${API_BASE_URL}/api/seller/auth/google`;
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem('seller_token');
            if (token) {
                await axios.post(
                    `${API_BASE_URL}/api/seller/auth/logout`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
            }
        } catch (error) {
            console.error('[SellerAuth] Logout error:', error);
        } finally {
            localStorage.removeItem('seller_token');
            setSeller(null);
            window.location.href = '/seller/login';
        }
    };

    const updateProfile = async (data: Partial<Seller>) => {
        const token = localStorage.getItem('seller_token');
        if (!token) throw new Error('Not authenticated');

        try {
            const response = await axios.put(
                `${API_BASE_URL}/api/seller/profile`,
                data,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data.success) {
                setSeller(response.data.seller);
            }
        } catch (error) {
            console.error('[SellerAuth] Profile update error:', error);
            throw error;
        }
    };

    const refreshProfile = async () => {
        const token = localStorage.getItem('seller_token');
        if (token) {
            await fetchSellerProfile(token);
        }
    };

    return (
        <SellerAuthContext.Provider
            value={{
                seller,
                loading,
                isAuthenticated,
                login,
                logout,
                updateProfile,
                refreshProfile,
            }}
        >
            {children}
        </SellerAuthContext.Provider>
    );
};

export const useSellerAuth = (): SellerAuthContextType => {
    const context = useContext(SellerAuthContext);
    if (!context) {
        throw new Error('useSellerAuth must be used within SellerAuthProvider');
    }
    return context;
};
