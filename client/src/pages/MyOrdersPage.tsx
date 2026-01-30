import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { formatPrice } from '../utils/formatPrice';

import { Tag, CheckCircle, Upload, Star } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface MarketOrder {
    order_id: string;
    item_name: string;
    unit_price: string;
    quantity: string;
    total_price: string;
    status: string;
    date: string;
    payment_proof?: string;
    resi?: string;
    tracking_number?: string;
    shipment_proof?: string;
    product_id?: string; // Ensure we have this from backend
    [key: string]: any;
}

export const MyOrdersPage: React.FC = () => {
    // const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'market' | 'event'>('market');
    const [orders, setOrders] = useState<MarketOrder[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Upload Modal State
    const [uploadingOrder, setUploadingOrder] = useState<MarketOrder | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Review Modal State
    const [reviewingOrder, setReviewingOrder] = useState<MarketOrder | null>(null);
    const [rating, setRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Config State
    const [adminPhone, setAdminPhone] = useState('6281382364484'); // Default fallback

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Helper: Safe Date Formatting
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return dateStr; // Return original string if valid
            }
            return date.toLocaleDateString();
        } catch (e) {
            return dateStr;
        }
    };

    useEffect(() => {
        fetchAll();
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/public/config`);
            if (res.data.adminPhone) {
                setAdminPhone(res.data.adminPhone);
            }
        } catch (error) {
            console.error('Failed to fetch config', error);
        }
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [ordersRes, bookingsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/my-market-orders`, { withCredentials: true }),
                axios.get(`${API_BASE_URL}/api/my-bookings`, { withCredentials: true })
            ]);
            setOrders(ordersRes.data);
            setBookings(bookingsRes.data);
        } catch (err: any) {
            console.error(err);
            setError('Failed to load data. Please login.');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadClick = (order: MarketOrder) => {
        setUploadingOrder(order);
        setSelectedFile(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const submitProof = async () => {
        if (!uploadingOrder || !selectedFile) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('orderId', uploadingOrder.order_id);
        formData.append('proof', selectedFile);

        try {
            await axios.post(`${API_BASE_URL}/api/marketplace/upload-proof`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            alert('Proof uploaded successfully!');
            setUploadingOrder(null);
            fetchAll(); // Refresh
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to upload proof.');
        } finally {
            setIsUploading(false);
        }
    };

    const handlePayNow = async (order: MarketOrder) => {
        try {
            // Snap.js is already loaded via index.html script tag
            // @ts-ignore
            if (!window.snap) {
                console.error('Midtrans Snap not loaded');
                alert('Payment gateway is not available');
                return;
            }

            const res = await axios.post(`${API_BASE_URL}/api/payment/resume`, { orderId: order.order_id }, { withCredentials: true });

            if (res.data.token) {
                // @ts-ignore
                window.snap.pay(res.data.token, {
                    onSuccess: function () {
                        showNotification('Payment Successful! Thank you for your order.');
                        fetchAll();
                    },
                    onPending: function () {
                        showNotification('Payment pending... Please check your email/app.');
                        fetchAll();
                    },
                    onError: function () {
                        showNotification('Payment failed. Please try again.', 'error');
                    },
                    onClose: function () {
                        // User closed modal
                    }
                });
            } else if (res.data.redirect_url) {
                window.open(res.data.redirect_url, '_blank');
            }
        } catch (err: any) {
            console.error('Resume Payment Error:', err);
            alert('Failed to resume payment: ' + (err.response?.data?.message || err.message));
        }
    };

    const confirmReceipt = async (orderId: string) => {
        if (!confirm('Are you sure you have received the item and it is in good condition? functionality check etc.')) return;

        try {
            await axios.post(`${API_BASE_URL}/api/marketplace/confirm-receipt`, { orderId }, { withCredentials: true });
            alert('Receipt confirmed. Thank you!');
            fetchAll();
        } catch (err) {
            console.error(err);
            alert('Failed to confirm receipt.');
        }
    };

    const handleReviewClick = (order: MarketOrder) => {
        setReviewingOrder(order);
        setRating(5);
        setReviewComment('');
    };

    const submitReview = async () => {
        if (!reviewingOrder) return;
        setIsSubmittingReview(true);
        try {
            await axios.post(`${API_BASE_URL}/api/reviews`, {
                productId: reviewingOrder.productId || reviewingOrder.product_id, // Handle both cases for safety
                orderId: reviewingOrder.order_id || reviewingOrder.id, // Handle potential ID mismatch too
                rating,
                comment: reviewComment
            }, { withCredentials: true });

            showNotification('Review submitted! Thank you.', 'success');
            setReviewingOrder(null);
            fetchAll();
        } catch (err: any) {
            console.error(err);
            showNotification(err.response?.data?.error || 'Failed to submit review', 'error');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // Payment Resume for Event Bookings
    const handlePayNowEvent = async (booking: any) => {
        try {
            // @ts-ignore - Snap.js is loaded globally
            if (!window.snap) {
                console.error('Midtrans Snap not loaded');
                alert('Payment gateway is not available');
                return;
            }

            const res = await axios.post(
                `${API_BASE_URL}/api/events/resume-payment`,
                { reservationId: booking.reservation_id },
                { withCredentials: true }
            );

            if (res.data.token) {
                // @ts-ignore
                window.snap.pay(res.data.token, {
                    onSuccess: function () {
                        alert('Payment Successful!');
                        fetchAll();
                    },
                    onPending: function () {
                        alert('Waiting for payment...');
                        fetchAll();
                    },
                    onError: function () {
                        alert('Payment failed!');
                    },
                    onClose: function () {
                        // User closed payment modal
                    }
                });
            } else if (res.data.redirect_url) {
                window.open(res.data.redirect_url, '_blank');
            }
        } catch (err: any) {
            console.error('Resume Event Payment Error:', err);
            alert('Failed to resume payment: ' + (err.response?.data?.error || err.message));
        }
    };

    // Helper for Status Color
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'verifying payment': return 'bg-blue-100 text-blue-800';
            case 'ready to ship': return 'bg-purple-100 text-purple-800';
            case 'shipped': return 'bg-indigo-100 text-indigo-800';
            case 'on shipment': return 'bg-indigo-100 text-indigo-800';
            case 'item received': return 'bg-green-100 text-green-800';
            case 'settled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative">
            <div className="bg-teal-800 text-white pt-10 pb-16 px-6 md:px-10 rounded-b-[2.5rem] shadow-lg mb-8">
                <h1 className="text-3xl font-bold">My Orders</h1>
                <p className="text-teal-100 text-sm">Track your purchases and bookings</p>
            </div>

            {/* Mobile Notification Banner */}
            {notification && (
                <div className={`fixed top-0 left-0 right-0 p-4 z-50 shadow-lg flex justify-between items-center ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    <span className="font-bold text-sm">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="text-white/80 hover:text-white">&times;</button>
                </div>
            )}

            <div className="px-6 md:px-10 max-w-4xl mx-auto space-y-6">
                {/* TABS */}
                <div className="flex p-1 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md">
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'market' ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Marketplace ({orders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('event')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'event' ? 'bg-orange-100 text-orange-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Event Bookings ({bookings.length})
                    </button>
                </div>

                {loading && <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto"></div></div>}

                {!loading && error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center border border-red-100 flex flex-col items-center gap-2">
                        <p>{error}</p>
                        <button
                            onClick={() => {
                                const width = 500;
                                const height = 600;
                                const left = (window.screen.width / 2) - (width / 2);
                                const top = (window.screen.height / 2) - (height / 2);
                                window.open(
                                    `${API_BASE_URL}/auth/google`,
                                    'Login',
                                    `width=${width},height=${height},left=${left},top=${top}`
                                );
                            }}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition shadow-sm"
                        >
                            Login Now
                        </button>
                    </div>
                )}

                {/* MARKET ORDERS VIEW */}
                {!loading && activeTab === 'market' && (
                    <div className="space-y-4">
                        {orders.length === 0 && (
                            <div className="text-center py-10">
                                <Tag className="mx-auto text-gray-300 mb-2" size={48} />
                                <p className="text-gray-500">No marketplace orders found.</p>
                            </div>
                        )}
                        {orders.map(order => (
                            <div key={order.order_id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-gray-400">#{order.order_id}</span>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${getStatusColor(order.status)}`}>
                                            {order.status || 'Pending'}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-800">{order.item_name}</h3>
                                    <p className="text-sm text-gray-500">{order.quantity} x {formatPrice(order.unit_price)}</p>
                                    <p className="text-orange-600 font-bold mt-1">{formatPrice(order.total_price)}</p>
                                    <p className="text-xs text-gray-400 mt-2">{formatDate(order.date)}</p>

                                    {/* Resi Display */}
                                    {(order.resi || order.tracking_number) && (
                                        <div className="mt-3 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                            <p className="text-xs text-blue-600 font-bold uppercase">Tracking Number (Resi)</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-mono text-gray-800 select-all">{order.resi || order.tracking_number}</p>
                                                {(order.shipment_proof || order['Shipment Proof']) && (
                                                    <a href={order.shipment_proof || order['Shipment Proof']} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">View Proof</a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col justify-center items-end gap-2">
                                    {['pending', 'pending payment', 'unpaid'].includes((order.status || '').toLowerCase()) && (
                                        <div className="flex gap-2">
                                            <button onClick={() => handlePayNow(order)} className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 flex items-center gap-2">
                                                <Tag size={16} /> Pay Now
                                            </button>
                                            <button onClick={() => handleUploadClick(order)} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                                <Upload size={16} /> Manual
                                            </button>
                                        </div>
                                    )}
                                    {['ready to ship', 'shipped', 'on shipment'].includes((order.status || '').toLowerCase()) && (
                                        <button onClick={() => confirmReceipt(order.order_id)} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 flex items-center gap-2">
                                            <CheckCircle size={16} /> Confirm Receipt
                                        </button>
                                    )}
                                    {['item received', 'completed'].includes((order.status || '').toLowerCase()) && (
                                        <button onClick={() => handleReviewClick(order)} className="px-4 py-2 bg-yellow-500 text-white text-sm font-bold rounded-lg hover:bg-yellow-600 flex items-center gap-2">
                                            <Star size={16} /> Rate Item
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* EVENT BOOKINGS VIEW */}
                {!loading && activeTab === 'event' && (
                    <div className="space-y-4">
                        {bookings.length === 0 && (
                            <div className="text-center py-10">
                                <Tag className="mx-auto text-gray-300 mb-2" size={48} />
                                <p className="text-gray-500">No event bookings found.</p>
                            </div>
                        )}
                        {bookings.map((booking, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">{booking.event_name}</h4>
                                        <p className="text-sm text-gray-500">{booking.date_submitted}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${booking.reservation_status?.toLowerCase().includes('confirm')
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {booking.reservation_status || 'Pending'}
                                    </span>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-2 gap-y-4 text-sm text-gray-600 mb-4">
                                    <div>
                                        <span className="text-gray-400 block text-xs uppercase font-bold">Tent Type</span>
                                        <span className="font-semibold text-gray-800">{booking.special_requests || booking.ukuran_tenda || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-xs uppercase font-bold">Accommodation</span>
                                        <span className="font-semibold text-gray-800">{booking.kavling || 'On Arrival'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-xs uppercase font-bold">Member Type</span>
                                        <span className="font-semibold text-gray-800">{booking.jenis_anggota || 'General'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-xs uppercase font-bold">Pax</span>
                                        <span className="font-semibold text-gray-800">{booking.participant_count} Person(s)</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                                    <div className="text-xs text-gray-400">
                                        ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{booking.reservation_id}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Pay Now button for Pending Payment bookings */}
                                        {(booking.reservation_status === 'Pending Payment' || booking.reservation_status === 'Pending') && (
                                            <button
                                                onClick={() => handlePayNowEvent(booking)}
                                                className="bg-teal-600 text-white text-sm px-4 py-2 rounded-xl font-bold hover:bg-teal-700 transition shadow-sm flex items-center gap-2"
                                            >
                                                <Tag size={16} /> Pay Now
                                            </button>
                                        )}
                                        {booking.link_tiket ? (
                                            <a href={booking.link_tiket} target="_blank" rel="noreferrer" className="bg-teal-600 text-white text-sm px-4 py-2 rounded-xl font-bold hover:bg-teal-700 transition shadow-sm flex items-center gap-2">
                                                Download Ticket
                                            </a>
                                        ) : (
                                            <a href={`https://wa.me/6281382364484?text=Assalamualaikum%2C%20saya%20sudah%20booking%20event%20${encodeURIComponent(booking.event_name)}%20(ID:%20${booking.reservation_id})%20dan%20ingin%20konfirmasi%20pembayaran.`} target="_blank" rel="noreferrer" className="bg-green-600 text-white text-sm px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition shadow-sm flex items-center gap-2">
                                                Confirm Payment
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Help / Contact Admin */}
            <div className="max-w-4xl mx-auto px-6 md:px-10 mt-8 text-center pb-10">
                <p className="text-gray-500 text-sm mb-3">Haven't received your item yet? Or need help?</p>
                <a
                    href={`https://wa.me/${adminPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /></svg>
                    Contact Admin via WhatsApp
                </a>
            </div>

            {/* Upload Modal */}
            {uploadingOrder && activeTab === 'market' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                        <h3 className="font-bold text-lg mb-2">Upload Payment Proof</h3>
                        <p className="text-sm text-gray-500 mb-4">Order #{uploadingOrder.order_id}</p>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />

                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setUploadingOrder(null)} className="flex-1 py-2 text-gray-500 font-bold">Cancel</button>
                            <button
                                onClick={submitProof}
                                disabled={!selectedFile || isUploading}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">
                                {isUploading ? 'Uploading...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {reviewingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                        <h3 className="font-bold text-lg mb-2">Rate & Review</h3>
                        <p className="text-sm text-gray-500 mb-4">{reviewingOrder.item_name}</p>

                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`p-1 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                >
                                    <Star size={32} fill={rating >= star ? "currentColor" : "none"} />
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="w-full p-3 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                            rows={3}
                            placeholder="Write your review here..."
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                        />

                        <div className="flex gap-2">
                            <button onClick={() => setReviewingOrder(null)} className="flex-1 py-2 text-gray-500 font-bold">Cancel</button>
                            <button
                                onClick={submitReview}
                                disabled={isSubmittingReview}
                                className="flex-1 py-2 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 disabled:opacity-50">
                                {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
