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
    const [orders, setOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Fetch Orders
    useEffect(() => {
        const fetchOrders = async () => {
            const token = localStorage.getItem('seller_token');
            if (!token) return;

            setLoadingOrders(true);
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/seller/orders`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setOrders(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch orders', error);
            } finally {
                setLoadingOrders(false);
            }
        };

        if (activeTab === 'orders' || activeTab === 'dashboard') {
            fetchOrders();
        }
    }, [activeTab]);

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

    // Shipping State
    const [shipModalOpen, setShipModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [resiInput, setResiInput] = useState('');
    const [shippingLoading, setShippingLoading] = useState(false);

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

    const handleOpenShipModal = (order: any) => {
        setSelectedOrder(order);
        setResiInput(order['Resi'] || order['Tracking Number'] || '');
        setShipModalOpen(true);
    };

    const handleShipOrder = async () => {
        if (!selectedOrder || !resiInput) return;
        setShippingLoading(true);
        try {
            const token = localStorage.getItem('seller_token');
            if (!token) return;

            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/seller/ship`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId: selectedOrder.order_id || selectedOrder['Order ID'],
                    resi: resiInput
                })
            });

            const data = await res.json();
            if (data.success) {
                setShipModalOpen(false);
                setResiInput('');
                setSelectedOrder(null);
                // Refresh orders
                const fetchOrders = async () => { /* ... reuse logic? or just trigger effect */ };
                // Creating a simplified refresh trigger by toggling activeTab briefly or just modifying state
                // Use functional state update to update local listing
                setOrders(prev => prev.map(o => o.order_id === selectedOrder.order_id ? { ...o, status: 'On Shipment', resi: resiInput } : o));
            } else {
                alert('Failed to ship: ' + data.error);
            }
        } catch (error) {
            console.error('Ship error:', error);
            alert('Failed to ship order');
        } finally {
            setShippingLoading(false);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                // Derived Stats
                const pendingCount = orders.filter(o =>
                    ['paid', 'ready to ship', 'processed'].includes((o.status || '').toLowerCase())
                ).length;

                const completedCount = orders.filter(o =>
                    (o.status || '').toLowerCase() === 'completed' || (o.status || '').toLowerCase() === 'sent'
                ).length;

                return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm">Total Items</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">-</p>
                                    </div>
                                    <FaBox className="text-3xl text-green-600" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm">Pending Orders</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">{loadingOrders ? '...' : pendingCount}</p>
                                    </div>
                                    <FaShippingFast className="text-3xl text-blue-600" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm">Completed</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">{loadingOrders ? '...' : completedCount}</p>
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Incoming Orders</h2>
                        <p className="text-gray-500 mb-4">Orders from Marketplace (Sheet: Market OB)</p>

                        {loadingOrders ? (
                            <div className="p-8 text-center text-gray-500">Loading orders...</div>
                        ) : orders.length === 0 ? (
                            <div className="bg-white p-8 rounded-lg shadow border border-gray-200 text-center">
                                <FaShippingFast className="text-6xl text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600">No orders yet.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID / Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {orders.map((order) => (
                                                <tr key={order.order_id || Math.random()}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-bold text-gray-900">#{order.order_id}</div>
                                                        <div className="text-xs text-gray-500">{order.date || '-'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900">{order.item_name}</div>
                                                        <div className="text-sm text-gray-500">{order.quantity} x {order.unit_price}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{order.user_name}</div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                                            {order.phone}
                                                            {/* WhatsApp Link if phone exists */}
                                                            {order.phone && (
                                                                <a
                                                                    href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-green-500 hover:text-green-600"
                                                                >
                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118 571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-green-600 font-bold">
                                                        {order.total_price}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status?.toLowerCase() === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                                                            order.status?.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                                                                order.status?.toLowerCase() === 'ready to ship' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {order.status || 'Pending'}
                                                        </span>
                                                        {order.status?.toLowerCase() === 'paid' && (
                                                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                                Auto-Confirmed
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        {order.status?.toLowerCase() === 'ready to ship' ? (
                                                            <button
                                                                onClick={() => handleOpenShipModal(order)}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded uppercase font-bold tracking-wider flex items-center gap-1"
                                                            >
                                                                <FaShippingFast /> Ship
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
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
            {/* Ship Modal */}
            {shipModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Ship Order #{selectedOrder?.order_id}</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number (Resi)</label>
                            <input
                                type="text"
                                value={resiInput}
                                onChange={(e) => setResiInput(e.target.value)}
                                placeholder="Enter receipt number..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShipModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleShipOrder}
                                disabled={!resiInput || shippingLoading}
                                className={`px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2`}
                            >
                                {shippingLoading ? 'Processing...' : 'Confirm Shipment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerDashboard;
