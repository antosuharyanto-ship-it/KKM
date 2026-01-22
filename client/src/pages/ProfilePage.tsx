import { useEffect, useState } from 'react';
import axios from 'axios';
import { LogOut, User as UserIcon, Mail, Download } from 'lucide-react';
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
    const [isOfficer, setIsOfficer] = useState(false); // New state

    const [bookings, setBookings] = useState<any[]>([]);

    useEffect(() => {
        // Fetch User Profile
        axios.get(`${API_BASE_URL}/auth/me`, { withCredentials: true })
            .then(res => {
                setUser(res.data);
                // Check Officer Status
                axios.get(`${API_BASE_URL}/api/officer/check`, { withCredentials: true })
                    .then(() => setIsOfficer(true))
                    .catch(() => setIsOfficer(false));

                // Fetch User Bookings
                return axios.get(`${API_BASE_URL}/api/my-bookings`, { withCredentials: true });
            })
            .then(res => {
                setBookings(res.data || []);
            })
            .catch(() => {
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

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
                        My Bookings
                        <span className="bg-nature-100 text-nature-800 text-xs px-2 py-1 rounded-full">{bookings.length}</span>
                    </h3>

                    {bookings.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm">
                            No bookings yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map((booking, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{booking.event_name}</h4>
                                            <p className="text-xs text-gray-500">{booking.date_submitted}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${booking.reservation_status?.toLowerCase().includes('confirm')
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {booking.reservation_status || 'Pending'}
                                        </span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-y-2 text-xs text-gray-600">
                                        <div>
                                            <span className="text-gray-400 block mb-0.5">Tent Type</span>
                                            <span className="font-medium text-gray-800">{booking.special_requests || booking.ukuran_tenda || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block mb-0.5">Accommodation</span>
                                            <span className="font-medium text-gray-800">{booking.kavling || 'Allocated on Arrival'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block mb-0.5">Member Type</span>
                                            <span className="font-medium text-gray-800">{booking.jenis_anggota || 'General'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block mb-0.5">Pax</span>
                                            <span className="font-medium text-gray-800">{booking.participant_count} Person(s)</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mt-4">
                                        <div className="text-xs text-gray-400">
                                            ID: <span className="font-mono">{booking.reservation_id}</span>
                                        </div>

                                        {/* Actions */}
                                        {booking.link_tiket ? (
                                            <a
                                                href={booking.link_tiket}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-teal-600 text-white text-xs px-3 py-2 rounded-lg font-bold hover:bg-teal-700 transition flex items-center gap-2 shadow-sm"
                                            >
                                                <Download size={14} /> Download Ticket
                                            </a>
                                        ) : (
                                            <a
                                                href={`https://wa.me/6281382364484?text=Assalamualaikum%2C%20saya%20sudah%20booking%20event%20${encodeURIComponent(booking.event_name)}%20(ID:%20${booking.reservation_id})%20dan%20ingin%20konfirmasi%20pembayaran.`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-green-600 text-white text-xs px-3 py-2 rounded-lg font-bold hover:bg-green-700 transition flex items-center gap-1 shadow-sm"
                                            >
                                                Confirm Payment
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Menu Items */}
                <div className="bg-white rounded-2xl shadow-sm border border-earth-100 overflow-hidden">
                    <button onClick={handleLogout} className="w-full text-left px-6 py-4 text-red-600 font-medium hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};
