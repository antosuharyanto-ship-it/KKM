import React, { useState } from 'react';
import { useSellerAuth } from '../contexts/SellerAuthContext';
import { FaStore, FaBox, FaShippingFast, FaUser, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';

const SellerDashboard: React.FC = () => {
    const { seller, logout } = useSellerAuth();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'orders' | 'profile'>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const menuItems = [
        { id: 'dashboard' as const, label: 'Dashboard', icon: FaStore },
        { id: 'items' as const, label: 'My Items', icon: FaBox },
        { id: 'orders' as const, label: 'Orders', icon: FaShippingFast },
        { id: 'profile' as const, label: 'Profile', icon: FaUser },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm">Total Items</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                                    </div>
                                    <FaBox className="text-3xl text-green-600" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm">Pending Orders</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                                    </div>
                                    <FaShippingFast className="text-3xl text-blue-600" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm">Completed</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                                    </div>
                                    <FaStore className="text-3xl text-purple-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'items':
                return (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">My Items</h2>
                            <button className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                                Add New Item
                            </button>
                        </div>
                        <div className="bg-white p-8 rounded-lg shadow border border-gray-200 text-center">
                            <FaBox className="text-6xl text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">No items yet. Click "Add New Item" to get started.</p>
                        </div>
                    </div>
                );

            case 'orders':
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders</h2>
                        <div className="bg-white p-8 rounded-lg shadow border border-gray-200 text-center">
                            <FaShippingFast className="text-6xl text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">No orders yet.</p>
                        </div>
                    </div>
                );

            case 'profile':
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <p className="text-gray-900">{seller?.full_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <p className="text-gray-900">{seller?.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <p className="text-gray-900">{seller?.phone || 'Not set'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                                    <p className="text-gray-900">{seller?.whatsapp || 'Not set'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${seller?.status === 'active'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                        {seller?.status || 'Unknown'}
                                    </span>
                                </div>
                            </div>
                            <button className="mt-6 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                                Edit Profile
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">Seller Dashboard</h1>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="text-gray-600 hover:text-gray-900"
                >
                    {sidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                </button>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300`}
                >
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                                <FaStore className="text-white text-xl" />
                            </div>
                            <div className="hidden lg:block">
                                <h1 className="font-bold text-gray-900">KKM Marketplace</h1>
                                <p className="text-sm text-gray-600">Seller Portal</p>
                            </div>
                        </div>
                    </div>

                    <nav className="p-4">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${activeTab === item.id
                                        ? 'bg-green-50 text-green-700 font-medium'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <item.icon className="text-xl" />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <FaSignOutAlt className="text-xl" />
                            <span>Logout</span>
                        </button>
                    </div>
                </aside>

                {/* Overlay for mobile */}
                {sidebarOpen && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 p-6 lg:p-8">
                    {/* Welcome Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome back, {seller?.full_name?.split(' ')[0] || 'Seller'}!
                        </h1>
                        <p className="text-gray-600">Manage your products and orders</p>
                    </div>

                    {/* Dynamic Content */}
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default SellerDashboard;
