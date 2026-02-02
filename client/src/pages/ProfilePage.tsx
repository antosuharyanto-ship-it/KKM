import { useEffect, useState } from 'react';
import axios from 'axios';
import { LogOut, User as UserIcon, Mail, Plus, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface User {
    id: string;
    google_id: string;
    display_name: string;
    email: string;
    avatar_url: string;
}

export const ProfilePage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOfficer, setIsOfficer] = useState(false);

    const [addresses, setAddresses] = useState<any[]>([]);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [cities, setCities] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        label: 'Home',
        recipientName: '',
        phone: '',
        addressStreet: '',
        addressProvinceId: '',
        addressProvinceName: '',
        addressCityId: '',
        addressCityName: '',
        postalCode: '',
        isDefault: false
    });

    useEffect(() => {
        // Fetch User Profile
        axios.get(`${API_BASE_URL}/auth/me`, { withCredentials: true })
            .then(res => {
                setUser(res.data);
                if (res.data) {
                    fetchAddresses();
                }
                // Check Officer Status
                axios.get(`${API_BASE_URL}/api/officer/check`, { withCredentials: true })
                    .then(() => setIsOfficer(true))
                    .catch(() => setIsOfficer(false));
            })
            .catch(() => {
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const fetchAddresses = () => {
        axios.get(`${API_BASE_URL}/api/user/addresses`, { withCredentials: true })
            .then(res => setAddresses(res.data))
            .catch(console.error);
    };

    const handleSaveAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/api/user/addresses`, formData, { withCredentials: true });
            setShowAddressModal(false);
            fetchAddresses();
            setFormData({
                label: 'Home', recipientName: '', phone: '', addressStreet: '',
                addressProvinceId: '', addressProvinceName: '', addressCityId: '', addressCityName: '',
                postalCode: '', isDefault: false
            });
        } catch (error) {
            alert('Failed to save address');
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm('Delete this address?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/user/addresses/${id}`, { withCredentials: true });
            fetchAddresses();
        } catch (error) {
            alert('Failed to delete address');
        }
    };

    const handleLogin = () => {
        // Redirect to backend auth
        window.location.href = `${API_BASE_URL}/auth/google`;
    };

    const handleLogout = async () => {
        try {
            await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
            setUser(null);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Checking session...</div>;

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                <div className="w-20 h-20 bg-nature-100 rounded-full flex items-center justify-center mb-4 text-nature-600">
                    <UserIcon size={40} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome</h1>
                <p className="text-gray-500 mt-2 max-w-xs">Sign in to save your bookings and manage your profile.</p>

                <button
                    onClick={handleLogin}
                    className="mt-8 bg-white border border-gray-300 px-6 py-3 rounded-xl font-medium flex items-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
                    Continue with Google
                </button>
            </div>
        );
    }

    return (
        <div className="pb-24">
            <div className="bg-teal-900 text-white pt-12 pb-24 px-6 rounded-b-[2.5rem]">
                <div className="flex items-center gap-4">
                    <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        className="w-16 h-16 rounded-full border-4 border-teal-700 bg-teal-800"
                    />
                    <div>
                        <h1 className="text-2xl font-bold">{user.display_name}</h1>
                        <p className="text-teal-200 text-sm flex items-center gap-1">
                            <Mail size={12} /> {user.email}
                        </p>
                        <p className="text-teal-300 text-xs mt-1 uppercase tracking-wider font-bold border border-teal-700 inline-block px-2 py-0.5 rounded-md">
                            Role: {(user as any).role || 'User'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-6 -mt-12 space-y-4">
                {/* Officer Link (Only if Officer) */}
                {isOfficer && (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-200 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-900">Officer Dashboard</h3>
                            <p className="text-xs text-gray-500">Manage bookings & scan tickets</p>
                        </div>
                        <a href="/dashboard" className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition">
                            Open
                        </a>
                    </div>
                )}

                {/* Stats / Dashboard Cards */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex justify-between items-center">
                        My Activity
                    </h3>
                    <div className="text-center py-6">
                        <p className="text-gray-500 text-sm mb-4">View your event bookings and marketplace orders in one place.</p>
                        <a href="/my-bookings" className="inline-block bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition shadow-lg shadow-teal-200">
                            Go to My Orders
                        </a>
                    </div>
                </div>

                {/* My Addresses */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-100 mb-4">
                    <h3 className="font-bold text-gray-900 mb-4 flex justify-between items-center">
                        My Addresses
                        <button onClick={() => setShowAddressModal(true)} className="bg-teal-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 hover:bg-teal-700 transition">
                            <Plus size={12} /> Add
                        </button>
                    </h3>
                    <div className="space-y-3">
                        {addresses.length === 0 ? (
                            <p className="text-gray-400 text-xs text-center py-4">No addresses saved.</p>
                        ) : (
                            addresses.map((addr, idx) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-gray-800">{addr.label}</span>
                                            {addr.is_default && <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">Default</span>}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            <p>{addr.recipient_name} ({addr.phone})</p>
                                            <p>{addr.address_street}, {addr.address_city_name}, {addr.address_province_name} {addr.postal_code}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-400 hover:text-red-500 transition">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Menu Items */}
                <div className="bg-white rounded-2xl shadow-sm border border-earth-100 overflow-hidden">
                    <button onClick={handleLogout} className="w-full text-left px-6 py-4 text-red-600 font-medium hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
                <div className="text-center mt-8">
                    <p className="text-[10px] text-gray-400 font-medium flex items-center justify-center gap-1">
                        Powered by <span className="text-teal-600 font-bold tracking-wide uppercase bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">Mastery AI</span> by Abu Fatih
                    </p>
                </div>
            </div>

            {/* Address Modal */}
            {showAddressModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddressModal(false)}>
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-teal-900 mb-4">Add New Address</h2>
                        <form onSubmit={handleSaveAddress} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Label (e.g. Home, Office)</label>
                                <input required className="w-full p-2 rounded-lg border border-gray-200"
                                    value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recipient Name</label>
                                    <input required className="w-full p-2 rounded-lg border border-gray-200"
                                        value={formData.recipientName} onChange={e => setFormData({ ...formData, recipientName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                                    <input required className="w-full p-2 rounded-lg border border-gray-200"
                                        value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City / District Search</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Type city name (e.g. Jakarta Barat)..."
                                        className="w-full p-2 rounded-lg border border-gray-200"
                                        value={formData.addressCityName}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setFormData(prev => ({ ...prev, addressCityName: val }));
                                            if (val.length > 2) {
                                                // Trigger search logic (debounced ideally, but simple here)
                                                axios.get(`${API_BASE_URL}/api/locations/search?query=${val}`)
                                                    .then(res => setCities(res.data))
                                                    .catch(console.error);
                                            } else {
                                                setCities([]);
                                            }
                                        }}
                                    />
                                    {cities.length > 0 && (
                                        <div className="absolute z-10 w-full bg-white border border-gray-100 mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                            {cities.map((city: any, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-2 hover:bg-teal-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                                                    onClick={() => {
                                                        // Komerce returns rich object. We map to our schema.
                                                        // Schema: { id, name, zip_code, district_name, city_name, province_name, ... }
                                                        // We save ID as City ID.
                                                        setFormData({
                                                            ...formData,
                                                            addressCityId: city.id.toString(), // Destination ID
                                                            addressCityName: `${city.label || city.name}`, // Display Name
                                                            addressProvinceId: city.province_id || '', // If available
                                                            addressProvinceName: city.province_name || city.province || '',
                                                            postalCode: city.zip_code || '',
                                                        });
                                                        setCities([]); // Hide list
                                                    }}
                                                >
                                                    <span className="font-bold text-gray-800">{city.label || city.name}</span>
                                                    {(city.zip_code) && <span className="text-gray-400 text-xs ml-2">({city.zip_code})</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Select from suggestions to calculate accurate shipping.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Street Address</label>
                                <textarea required className="w-full p-2 rounded-lg border border-gray-200 h-20"
                                    value={formData.addressStreet} onChange={e => setFormData({ ...formData, addressStreet: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Postal Code</label>
                                <input required className="w-full p-2 rounded-lg border border-gray-200"
                                    value={formData.postalCode} onChange={e => setFormData({ ...formData, postalCode: e.target.value })} />
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isDefault"
                                    checked={formData.isDefault} onChange={e => setFormData({ ...formData, isDefault: e.target.checked })} />
                                <label htmlFor="isDefault" className="text-sm text-gray-600">Set as primary address</label>
                            </div>

                            <button type="submit" className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition">
                                Save Address
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
