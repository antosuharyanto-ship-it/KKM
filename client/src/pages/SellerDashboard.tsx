import React, { useState, useEffect } from 'react';
import { useSellerAuth } from '../contexts/SellerAuthContext';
import { FaStore, FaBox, FaShippingFast, FaUser, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import ProductList from '../components/seller/ProductList';
import ProductForm from '../components/seller/ProductForm';

const SellerDashboard: React.FC = () => {
    const { seller, logout, updateProfile } = useSellerAuth();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'orders' | 'profile' | 'add-item' | 'edit-profile'>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Profile Edit State
    const [editForm, setEditForm] = useState({
        full_name: '',
        phone: '',
        whatsapp: '',
        address: '',
        bank_account: '',
        // Shipping Config
        address_province: '',
        address_city: '',
        address_subdistrict: '',
        address_postal_code: '',
        shipping_origin_id: ''
    });

    // Location Search State
    const [locationQuery, setLocationQuery] = useState('');
    const [locationResults, setLocationResults] = useState<any[]>([]);
    const [showLocationResults, setShowLocationResults] = useState(false);
    const [searchingLocation, setSearchingLocation] = useState(false);

    // Product Management State
    const [editingProduct, setEditingProduct] = useState<any>(null);

    const menuItems = [
        { id: 'dashboard' as const, label: 'Dashboard', icon: FaStore },
        { id: 'items' as const, label: 'My Items', icon: FaBox },
        { id: 'orders' as const, label: 'Orders', icon: FaShippingFast },
        { id: 'profile' as const, label: 'Profile', icon: FaUser },
    ];

    const handleEditProfile = () => {
        if (seller) {
            setEditForm({
                full_name: seller.full_name || '',
                phone: seller.phone || '',
                whatsapp: seller.whatsapp || '',
                address: seller.address || '',
                bank_account: seller.bank_account || '',
                address_province: seller.address_province || '',
                address_city: seller.address_city || '',
                address_subdistrict: seller.address_subdistrict || '',
                address_postal_code: seller.address_postal_code || '',
                shipping_origin_id: seller.shipping_origin_id || ''
            });
            // Pre-fill search query if data exists
            if (seller.address_city || seller.address_subdistrict) {
                setLocationQuery(`${seller.address_subdistrict || ''} ${seller.address_city || ''}`.trim());
            } else {
                setLocationQuery('');
            }
            setActiveTab('edit-profile');
        }
    };

    // Location Search Handler
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (locationQuery.length >= 3 && showLocationResults) {
                setSearchingLocation(true);
                try {
                    // Use axios directly or context if available, assuming axios is imported
                    // We need the token here. best to use a specialized hook or just axios with local token
                    const token = localStorage.getItem('seller_token');
                    if (!token) return;

                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/seller/location-search?q=${locationQuery}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.results) {
                        setLocationResults(data.results);
                    }
                } catch (err) {
                    console.error('Location search failed', err);
                } finally {
                    setSearchingLocation(false);
                }
            } else {
                setLocationResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [locationQuery, showLocationResults]);

    const selectLocation = (loc: any) => {
        setEditForm(prev => ({
            ...prev,
            address_province: loc.province_name || '',
            address_city: loc.city_name || '',
            address_subdistrict: loc.subdistrict_name || '',
            address_postal_code: loc.zip_code || '',
            shipping_origin_id: String(loc.id) // Komerce Subdistrict ID
        }));
        setLocationQuery(`${loc.subdistrict_name}, ${loc.city_name}, ${loc.province_name}`);
        setShowLocationResults(false);
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateProfile(editForm);
            setActiveTab('profile');
        } catch (error) {
            console.error('Failed to update profile', error);
            // In a real app, show error notification
        }
    };

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
                    <ProductList
                        onAddProduct={() => {
                            setEditingProduct(null);
                            setActiveTab('add-item');
                        }}
                        onEditProduct={(product) => {
                            setEditingProduct(product);
                            setActiveTab('add-item');
                        }}
                    />
                );

            case 'add-item':
                return (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <button
                                onClick={() => setActiveTab('items')}
                                className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
                            >
                                &larr; Back to Items
                            </button>
                        </div>
                        <ProductForm
                            initialData={editingProduct}
                            onSuccess={() => setActiveTab('items')}
                            onCancel={() => setActiveTab('items')}
                        />
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
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 max-w-2xl">
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <p className="text-gray-900">{seller?.address || 'Not set'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                                    <p className="text-gray-900">{seller?.bank_account || 'Not set'}</p>
                                </div>
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="font-bold text-gray-800 mb-2">Shipping Origin</h3>
                                    <p className="text-gray-600 text-sm mb-1">{seller?.shipping_origin_id ? 'Location Set' : 'Not configured'}</p>
                                    <p className="text-gray-900">
                                        {[seller?.address_subdistrict, seller?.address_city, seller?.address_province]
                                            .filter(Boolean)
                                            .join(', ') || '-'}
                                    </p>
                                    {seller?.address_postal_code && <p className="text-gray-500 text-sm">Postal Code: {seller?.address_postal_code}</p>}
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
                            <button
                                onClick={handleEditProfile}
                                className="mt-6 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                Edit Profile
                            </button>
                        </div>
                    </div>
                );

            case 'edit-profile':
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h2>
                        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 max-w-2xl">
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={editForm.full_name}
                                        onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone}
                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={editForm.whatsapp}
                                        onChange={e => setEditForm({ ...editForm, whatsapp: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <textarea
                                        value={editForm.address}
                                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                                    <input
                                        type="text"
                                        value={editForm.bank_account}
                                        onChange={e => setEditForm({ ...editForm, bank_account: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                                        placeholder="Bank Name - Account Number - Holder Name"
                                    />
                                </div>

                                {/* Shipping Origin Input */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="font-bold text-gray-800 mb-2">Shipping Origin (Required for Shipping Calculation)</h3>
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Search District / City</label>
                                        <input
                                            type="text"
                                            value={locationQuery}
                                            onChange={e => {
                                                setLocationQuery(e.target.value);
                                                setShowLocationResults(true);
                                            }}
                                            onFocus={() => setShowLocationResults(true)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                                            placeholder="Type district name (e.g. Gambir, Jakarta Pusat)..."
                                        />
                                        {searchingLocation && <div className="absolute right-3 top-9 text-xs text-gray-400">Searching...</div>}

                                        {showLocationResults && locationResults.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {locationResults.map((loc, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => selectLocation(loc)}
                                                        className="w-full text-left px-4 py-2 hover:bg-green-50 text-sm border-b border-gray-100 last:border-0"
                                                    >
                                                        <span className="font-bold text-gray-800">{loc.subdistrict_name}</span>
                                                        <span className="text-gray-500 block text-xs">{loc.type} {loc.city_name}, {loc.province_name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500">
                                        Selected: {[editForm.address_subdistrict, editForm.address_city, editForm.address_province].filter(Boolean).join(', ') || 'None'}
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('profile')}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
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
                        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 flex flex-col h-screen lg:h-auto`}
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

                    <nav className="p-4 flex-1 overflow-y-auto">
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

                    <div className="p-4 border-t border-gray-200">
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
                <main className="flex-1 p-6 lg:p-8 min-h-screen">
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
