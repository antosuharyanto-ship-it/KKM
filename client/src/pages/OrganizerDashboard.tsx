
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../utils/formatPrice';
import {
    LayoutDashboard, Users, CheckCircle, Wallet, Tent,
    Search, Filter, Download, XCircle, RefreshCw, Tag, Edit
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next'; // Import Hook

interface Booking {
    reservation_id: string;
    event_name: string;
    proposed_by: string;
    participant_count: string;
    kavling: string;
    reservation_status: string;
    check_in?: string;
    email_address: string;
    phone_number: string;
    jenis_anggota: string; // Member Type
    special_requests: string; // Tent Type
    jumlah_pembayaran: string;
    link_tiket?: string;
    date_submitted: string;
}

export const OrganizerDashboard: React.FC = () => {
    const { t } = useTranslation(); // Use Hook
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isOfficer, setIsOfficer] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [marketOrders, setMarketOrders] = useState<any[]>([]);
    const [marketError, setMarketError] = useState<string | null>(null); // Keep original type
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    // Refund/Cancel State
    const [cancelModal, setCancelModal] = useState<any | null>(null);
    const [refundModal, setRefundModal] = useState<any | null>(null);
    const [cancelReason, setCancelReason] = useState('seller_issue');
    const [cancelNotes, setCancelNotes] = useState('');
    const [refundAmount, setRefundAmount] = useState('');
    const [refundMethod, setRefundMethod] = useState('manual_transfer');
    const [refundNotes, setRefundNotes] = useState('');
    const [refundProof, setRefundProof] = useState('');


    // --- Stats State ---
    const [stats, setStats] = useState({
        totalBookings: 0,
        totalPax: 0,
        confirmedPaid: 0,
        pendingPayment: 0,
        checkedIn: 0,
        revenue: 0,
        tentTypes: {} as Record<string, number>,
        memberTypes: {} as Record<string, number>
    });

    const [activeTab, setActiveTab] = useState<'events' | 'market' | 'sellers'>('events');
    const [sellerList, setSellerList] = useState<any[]>([]);
    const [allowlist, setAllowlist] = useState<any[]>([]);
    const [newAllowEmail, setNewAllowEmail] = useState('');
    const [editingSeller, setEditingSeller] = useState<any | null>(null);
    const [feeForm, setFeeForm] = useState({ buyerFee: '', sellerFee: '' });

    // News State
    const [newsTitle, setNewsTitle] = useState('');
    const [newsContent, setNewsContent] = useState('');
    const [newsType, setNewsType] = useState('General');
    const [postingNews, setPostingNews] = useState(false);
    const [showNewsForm, setShowNewsForm] = useState(false);

    const [currentUser, setCurrentUser] = useState<any>(null);

    // 1. Check Auth & Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch User Identity first
                try {
                    const userRes = await axios.get(`${API_BASE_URL}/auth/me`, { withCredentials: true });
                    setCurrentUser(userRes.data);
                } catch (e) {
                    console.warn('Not logged in at all');
                }

                // Check Officer
                await axios.get(`${API_BASE_URL}/api/officer/check`, { withCredentials: true });
                setIsOfficer(true);

                // Fetch Bookings (Event)
                const res = await axios.get(`${API_BASE_URL}/api/officer/bookings`, { withCredentials: true });
                setBookings(res.data);
                calculateStats(res.data);

                // Fetch Market Orders
                try {
                    const marketRes = await axios.get(`${API_BASE_URL}/api/marketplace/orders`, { withCredentials: true });
                    setMarketOrders(marketRes.data);
                } catch (e) {
                    const errMsg = e instanceof Error ? e.message : 'Unknown error';
                    console.warn('Failed to fetch market orders', e);
                    setMarketError('Failed to load market orders: ' + errMsg);
                }

            } catch (error) {
                console.error('Access denied or error', error);
                setIsOfficer(false);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

    }, []);

    // Fetch Seller Data when tab is active
    useEffect(() => {
        if (activeTab === 'sellers' && isOfficer) {
            fetchSellersAndAllowlist();
        }
    }, [activeTab, isOfficer]);

    const fetchSellersAndAllowlist = async () => {
        try {
            const [sellersRes, allowRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/officer/sellers`, { withCredentials: true }),
                axios.get(`${API_BASE_URL}/api/officer/sellers/allowlist`, { withCredentials: true })
            ]);
            setSellerList(sellersRes.data.sellers);
            setAllowlist(allowRes.data.allowlist);
        } catch (error) {
            console.error('Failed to fetch seller data', error);
        }
    };

    const handleAddAllowlist = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/officer/sellers/allowlist`, { email: newAllowEmail }, { withCredentials: true });
            setNewAllowEmail('');
            fetchSellersAndAllowlist();
            alert('Email added to allowlist');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to add email');
        }
    };

    const handleDeleteAllowlist = async (email: string) => {
        if (!confirm(`Remove ${email} from allowlist?`)) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/officer/sellers/allowlist/${email}`, { withCredentials: true });
            fetchSellersAndAllowlist();
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const handleUpdateFees = async () => {
        if (!editingSeller) return;
        try {
            await axios.put(`${API_BASE_URL}/api/officer/sellers/${editingSeller.id}`, {
                buyerFeePercent: feeForm.buyerFee,
                sellerFeePercent: feeForm.sellerFee
            }, { withCredentials: true });
            setEditingSeller(null);
            fetchSellersAndAllowlist();
            alert('Fees updated');
        } catch (error) {
            alert('Failed to update fees');
        }
    };

    const calculateStats = (data: Booking[]) => {
        const newStats = {
            totalBookings: data.length,
            totalPax: 0,
            confirmedPaid: 0,
            pendingPayment: 0,
            checkedIn: 0,
            revenue: 0,
            tentTypes: {} as Record<string, number>,
            memberTypes: {} as Record<string, number>
        };

        data.forEach(b => {
            // Pax
            const pax = parseInt(b.participant_count || '0');
            newStats.totalPax += isNaN(pax) ? 0 : pax;

            // Payment Status
            const status = (b.reservation_status || '').toLowerCase();
            if (status.includes('confirm')) {
                newStats.confirmedPaid++;
            } else {
                newStats.pendingPayment++;
            }

            // Check In
            if ((b.check_in || '').toLowerCase() === 'yes') {
                newStats.checkedIn++;
            }

            // Revenue (Clean up "Rp " and dots)
            const price = parseInt((b.jumlah_pembayaran || '0').replace(/[^0-9]/g, ''));
            if (!isNaN(price) && status.includes('confirm')) {
                newStats.revenue += price;
            }

            // Tent Type
            const tent = b.special_requests || 'Unknown';
            newStats.tentTypes[tent] = (newStats.tentTypes[tent] || 0) + 1;

            // Member Type
            const member = b.jenis_anggota || 'General';
            newStats.memberTypes[member] = (newStats.memberTypes[member] || 0) + 1;
        });

        setStats(newStats);
    };

    const handleConfirmPayment = async (ticketCode: string) => {
        if (!confirm('Confirm payment for this booking? This will generate a ticket.')) return;

        setProcessingId(ticketCode);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/officer/confirm-payment`,
                { ticketCode, kavling: '' }, // Should be optional now
                { withCredentials: true }
            );

            if (res.data.success) {
                const updatedBookings = bookings.map(b =>
                    b.reservation_id === ticketCode
                        ? { ...b, reservation_status: 'Confirmed Payment', link_tiket: res.data.ticketLink, kavling: 'TBA' }
                        : b
                );
                setBookings(updatedBookings);
                calculateStats(updatedBookings);
                alert('Payment Confirmed & Ticket Generated!');
            }
        } catch (error: any) {
            alert('Failed: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleAssignKavling = async (ticketCode: string) => {
        const newKavling = prompt("Enter Kavling Number (e.g. A-12):");
        if (!newKavling) return;

        setProcessingId(ticketCode);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/officer/assign-kavling`,
                { ticketCode, kavling: newKavling },
                { withCredentials: true }
            );

            if (res.data.success) {
                const updatedBookings = bookings.map(b =>
                    b.reservation_id === ticketCode
                        ? { ...b, kavling: newKavling }
                        : b
                );
                setBookings(updatedBookings);
                alert('Kavling Assigned!');
            }
        } catch (error: any) {
            alert('Failed: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleRegenerateTicket = async (ticketCode: string, name: string) => {
        if (!confirm(`Regenerate ticket for ${name}? This will overwrite the existing file.`)) return;

        setProcessingId(ticketCode);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/officer/regenerate-ticket`,
                { ticketCode },
                { withCredentials: true }
            );

            if (res.data.success) {
                const updatedBookings = bookings.map(b =>
                    b.reservation_id === ticketCode
                        ? { ...b, link_tiket: res.data.ticketLink }
                        : b
                );
                setBookings(updatedBookings);
                alert('Ticket Regenerated!');
            }
        } catch (error: any) {
            alert('Failed to regenerate: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setProcessingId(null);
        }
    };

    const handlePostNews = async (e: React.FormEvent) => {
        e.preventDefault();
        setPostingNews(true);
        try {
            await axios.post(`${API_BASE_URL}/api/news`, {
                title: newsTitle,
                content: newsContent,
                type: newsType
            }, { withCredentials: true });

            alert('News Posted Successfully!');
            setNewsTitle('');
            setNewsContent('');
            setShowNewsForm(false);
        } catch (error) {
            alert('Failed to post news');
        } finally {
            setPostingNews(false);
        }
    };

    // Filtering
    const filteredBookings = bookings.filter(b => {
        const matchesSearch =
            b.proposed_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.reservation_id?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'All'
            ? true
            : filterStatus === 'Confirmed'
                ? b.reservation_status?.toLowerCase().includes('confirm')
                : !b.reservation_status?.toLowerCase().includes('confirm');

        return matchesSearch && matchesStatus;
    });

    // Event Management Logic
    interface Event {
        id: string; // or event_id depending on sheet
        title: string; // or activity
        price_new_member?: string;
        price_alumni?: string;
        price_general?: string;
        [key: string]: any;
    }
    const [events, setEvents] = useState<Event[]>([]);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [editPrices, setEditPrices] = useState<{ newMember: string, alumni: string }>({ newMember: '', alumni: '' });

    useEffect(() => {
        if (isOfficer) {
            // fetchBookings(); // This is already called in the initial useEffect
            fetchEvents();
        }
    }, [isOfficer]); // Removed filterStatus, searchTerm as they are for bookings, not events

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/events`);
            // Normalize keys if needed, assuming API returns snake_case or whatever is in sheet
            // Sheet headers: id, Activity, ... price_new_member ...
            // getEvents returns object with keys as lowercased_underscored
            setEvents(res.data);
        } catch (error) {
            console.error('Failed to fetch events');
        }
    };

    const handleEditClick = (event: Event) => {
        setEditingEventId(event.id || event.event_id);
        setEditPrices({
            newMember: event.price_new_member || '0',
            alumni: event.price_alumni || '0'
        });
    };

    const handleSavePrice = async (eventId: string) => {
        try {
            await axios.put(`${API_BASE_URL}/api/events/${eventId}`, {
                price_new_member: editPrices.newMember,
                price_alumni: editPrices.alumni
            }, { withCredentials: true });

            alert('Prices updated!');
            setEditingEventId(null);
            fetchEvents(); // Refresh
        } catch (error) {
            alert('Failed to update price');
        }
    };

    const handleVerifyPayment = (orderId: string) => {
        const order = marketOrders.find(o => (o.order_id || o['Order ID']) === orderId);
        if (order) {
            setSelectedOrder(order);
        }
    };

    const submitVerification = async (order: any) => {
        const orderId = order.order_id || order['Order ID'];
        setProcessingId(orderId);
        try {
            await axios.post(`${API_BASE_URL}/api/officer/marketplace/verify-payment`, { orderId }, { withCredentials: true });
            alert('Payment Verified! Seller notified.');
            // Refresh Orders
            const res = await axios.get(`${API_BASE_URL}/api/marketplace/orders`, { withCredentials: true });
            setMarketOrders(res.data);
            setSelectedOrder(null);
        } catch (error) {
            console.error(error);
            alert('Failed to verify payment');
        } finally {
            setProcessingId(null);
        }
    };

    const handleMarkSettled = async (orderId: string) => {
        if (!confirm('Mark this transaction as SETTLED? Ensure you have transferred funds to Seller.')) return;
        setProcessingId(orderId);
        try {
            // We can reuse updateMarketplaceOrder indirectly or creating a specific endpoint.
            // But existing endpoints don't strictly support "mark settled" specifically, but we could make one.
            // Or reuse verify? No.
            // Let's create a generic "update status" endpoint or just reuse verify-payment endpoint logic? 
            // Actually, the simplest is to just call `updateMarketplaceOrder` via a new officer endpoint or add a generic "update-status".
            // Let's just create a new endpoint quickly in next step if needed, or assume we add one.
            // Wait, I didn't create /api/officer/marketplace/update-status. 
            // I'll reuse /api/officer/marketplace/verify-payment but passing a status? 
            // No, that endpoint is hardcoded "Ready to Ship".
            // I will create /api/officer/marketplace/settle-order in index.ts later.
            // for now let's assume it exists.
            await axios.post(`${API_BASE_URL}/api/officer/marketplace/settle-order`, { orderId }, { withCredentials: true });
            alert('Order Settled!');
            const res = await axios.get(`${API_BASE_URL}/api/marketplace/orders`, { withCredentials: true });
            setMarketOrders(res.data);
        } catch (error) {
            alert('Failed to settle order');
        } finally {
            setProcessingId(null);
        }
    };

    const handleArchiveOrder = async (orderId: string) => {
        if (!confirm('Archive this order? It will be hidden from the main view.')) return;
        setProcessingId(orderId);
        try {
            await axios.post(`${API_BASE_URL}/api/officer/marketplace/archive-order`, { orderId }, { withCredentials: true });
            alert('Order Archived!');
            const res = await axios.get(`${API_BASE_URL}/api/marketplace/orders`, { withCredentials: true });
            setMarketOrders(res.data);
        } catch (error) {
            alert('Failed to archive order');
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancelOrder = async (order: any) => {
        setCancelModal(order);
        setCancelNotes('');
    };

    const submitCancellation = async () => {
        if (!cancelModal) return;

        try {
            setProcessingId(cancelModal.order_id || cancelModal['Order ID']);
            await axios.post(
                `${API_BASE_URL}/api/officer/marketplace/cancel-order`,
                {
                    orderId: cancelModal.order_id || cancelModal['Order ID'],
                    reason: cancelReason,
                    notes: cancelNotes
                },
                { withCredentials: true }
            );

            alert('Order cancelled successfully');
            setCancelModal(null);

            // Refresh orders
            const res = await axios.get(`${API_BASE_URL}/api/marketplace/orders`, { withCredentials: true });
            setMarketOrders(res.data);
        } catch (error) {
            console.error('Cancel failed:', error);
            alert('Failed to cancel order');
        } finally {
            setProcessingId(null);
        }
    };

    const handleProcessRefund = async (order: any) => {
        // Extract total price number
        const total = (order.total_price || order['Total Price'] || '0').replace(/[^0-9]/g, '');
        setRefundAmount(total);
        setRefundModal(order);
        setRefundNotes('');
        setRefundProof('');
    };

    const submitRefund = async () => {
        if (!refundModal || !refundAmount) {
            alert('Please enter refund amount');
            return;
        }

        try {
            setProcessingId(refundModal.order_id || refundModal['Order ID']);
            await axios.post(
                `${API_BASE_URL}/api/officer/marketplace/process-refund`,
                {
                    orderId: refundModal.order_id || refundModal['Order ID'],
                    amount: parseInt(refundAmount),
                    method: refundMethod,
                    proofUrl: refundProof,
                    notes: refundNotes
                },
                { withCredentials: true }
            );

            alert(`Refund processed successfully via ${refundMethod}`);
            setRefundModal(null);

            // Refresh orders
            const res = await axios.get(`${API_BASE_URL}/api/marketplace/orders`, { withCredentials: true });
            setMarketOrders(res.data);
        } catch (error) {
            console.error('Refund failed:', error);
            alert('Failed to process refund');
        } finally {
            setProcessingId(null);
        }
    };

    const handleNotifySeller = async (orderId: string) => {
        const order = marketOrders.find(o => (o.order_id || o['Order ID']) === orderId);
        if (!order) {
            alert('Order not found');
            return;
        }

        const supplierPhone = order.supplier_phone || order['Supplier Phone'];
        const itemName = order.item_name || order['Item Name'];
        const userName = order.user_name || order['User Name'];

        if (!supplierPhone) {
            alert('Supplier contact not available for this order');
            return;
        }

        // Open WhatsApp with pre-filled message
        const message = encodeURIComponent(
            `Hi! You have a new order #${orderId}\n` +
            `Item: ${itemName}\n` +
            `Customer: ${userName}\n` +
            `Please prepare for shipping.`
        );
        window.open(`https://wa.me/${supplierPhone.replace(/^0/, '62')}?text=${message}`, '_blank');

        // Update status to Ready to Ship
        setProcessingId(orderId);
        try {
            await axios.post(`${API_BASE_URL}/api/officer/marketplace/notify-seller`,
                { orderId },
                { withCredentials: true }
            );

            alert('Order marked as Ready to Ship!');
            // Refresh orders
            const res = await axios.get(`${API_BASE_URL}/api/marketplace/orders`, { withCredentials: true });
            setMarketOrders(res.data);
        } catch (error) {
            alert('Failed to update order status');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;
    if (!isOfficer) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <XCircle size={64} className="text-red-500 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-gray-500 mb-2">Restricted to Registration Officers.</p>
            {currentUser && (
                <div className="mb-6 bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-sm text-red-600 font-bold">You are logged in as:</p>
                    <p className="font-mono text-gray-800">{currentUser.email}</p>
                    <p className="text-xs text-gray-400 mt-1">Role: {currentUser.role || 'User'}</p>
                </div>
            )}
            <button onClick={() => navigate('/')} className="text-teal-600 font-bold hover:underline">Home</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20 pt-safe font-sans text-gray-900">
            {/* Header */}
            <header className="bg-teal-900 text-white p-6 sticky top-0 z-20 shadow-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <LayoutDashboard className="text-orange-400" /> {t('dashboard.title')}
                        </h1>
                        <p className="text-teal-200 text-sm">{t('dashboard.subtitle')}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowNewsForm(!showNewsForm)} className="bg-teal-700 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-lg flex items-center gap-2">
                            <Edit size={16} /> {t('dashboard.post_news')}
                        </button>
                        <button onClick={() => navigate('/scanner')} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-lg flex items-center gap-2">
                            {t('dashboard.open_scanner')} <Filter size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

                {/* News Form Modal/Section */}
                {showNewsForm && (
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-teal-100 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Post Announcement</h2>
                            <button onClick={() => setShowNewsForm(false)} className="text-gray-400 hover:text-red-500"><XCircle size={24} /></button>
                        </div>
                        <form onSubmit={handlePostNews} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                    value={newsTitle}
                                    onChange={e => setNewsTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                                <select
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                    value={newsType}
                                    onChange={e => setNewsType(e.target.value)}
                                >
                                    <option value="General">General</option>
                                    <option value="Alert">Alert/Urgent</option>
                                    <option value="Event">Event Update</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Content</label>
                                <textarea
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                    rows={4}
                                    value={newsContent}
                                    onChange={e => setNewsContent(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={postingNews}
                                    className="bg-teal-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-teal-900 transition flex items-center gap-2"
                                >
                                    {postingNews ? 'Posting...' : 'Publish Announcement'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Event Pricing Management */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Tag className="text-teal-500" size={18} /> Event Pricing
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-3">Event Name</th>
                                    <th className="p-3">New Member Price</th>
                                    <th className="p-3">Alumni Price</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {events.map(event => {
                                    const isEditing = editingEventId === (event.id || event.event_id);
                                    return (
                                        <tr key={event.id || event.event_id || Math.random()}>
                                            <td className="p-3 font-medium text-gray-900">{event.activity || event.title || event.event_name}</td>
                                            <td className="p-3">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editPrices.newMember}
                                                        onChange={(e) => setEditPrices({ ...editPrices, newMember: e.target.value })}
                                                        className="w-24 px-2 py-1 border rounded"
                                                    />
                                                ) : (
                                                    `Rp ${(parseInt(event.price_new_member || '0')).toLocaleString('id-ID')}`
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editPrices.alumni}
                                                        onChange={(e) => setEditPrices({ ...editPrices, alumni: e.target.value })}
                                                        className="w-24 px-2 py-1 border rounded"
                                                    />
                                                ) : (
                                                    `Rp ${(parseInt(event.price_alumni || '0')).toLocaleString('id-ID')}`
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {isEditing ? (
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleSavePrice(event.id || event.event_id)}
                                                            className="bg-green-100 text-green-700 p-1.5 rounded hover:bg-green-200"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingEventId(null)}
                                                            className="bg-red-100 text-red-700 p-1.5 rounded hover:bg-red-200"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditClick(event)}
                                                        className="bg-gray-100 text-gray-600 p-1.5 rounded hover:bg-gray-200"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {events.length === 0 && (
                                    <tr><td colSpan={4} className="p-4 text-center text-gray-400">No events found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* TAB NAVIGATION */}
                <div className="flex gap-4 border-b border-gray-200 mb-8">
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors relative ${activeTab === 'events' ? 'text-teal-700' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Event Bookings
                        {activeTab === 'events' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 rounded-t-full"></span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors relative ${activeTab === 'market' ? 'text-teal-700' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Marketplace Orders
                        {activeTab === 'market' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 rounded-t-full"></span>}
                    </button>
                    {isOfficer && (
                        <button
                            onClick={() => setActiveTab('sellers')}
                            className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors relative ${activeTab === 'sellers' ? 'text-teal-700' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Sellers & Fees
                            {activeTab === 'sellers' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 rounded-t-full"></span>}
                        </button>
                    )}
                </div>

                {activeTab === 'events' && (
                    <div className="space-y-8">
                        {/* 1. Statistics Cards - SAME AS BEFORE */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                icon={<Users className="text-blue-500" />}
                                label="Total Pax"
                                value={stats.totalPax.toString()}
                                sub={`${stats.totalBookings} Bookings`}
                            />
                            <StatCard
                                icon={<Wallet className="text-green-500" />}
                                label="Revenue (Est)"
                                value={`Rp ${stats.revenue.toLocaleString('id-ID')}`}
                                sub={`${stats.confirmedPaid} Paid`}
                            />
                            <StatCard
                                icon={<CheckCircle className="text-purple-500" />}
                                label="Check-ins"
                                value={stats.checkedIn.toString()}
                                sub={`${((stats.checkedIn / stats.totalPax) * 100 || 0).toFixed(1)}% Arrived`}
                            />
                            <StatCard
                                icon={<Tent className="text-orange-500" />}
                                label="Pending"
                                value={stats.pendingPayment.toString()}
                                sub="Need Verification"
                            />
                        </div>

                        {/* 2. Demographics - SAME AS BEFORE */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Tent Distribution</h3>
                                <div className="space-y-3">
                                    {Object.entries(stats.tentTypes).map(([type, count]) => (
                                        <div key={type} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                                            <span className="text-gray-600 text-sm font-medium">{type || 'Unspecified'}</span>
                                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-bold">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Membership</h3>
                                <div className="space-y-3">
                                    {Object.entries(stats.memberTypes).map(([type, count]) => (
                                        <div key={type} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                                            <span className="text-gray-600 text-sm font-medium">{type || 'General'}</span>
                                            <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded-md text-xs font-bold">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 3. Bookings Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Toolbar - SAME AS BEFORE */}
                            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search Name or ID..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Filter size={18} className="text-gray-400" />
                                    <select
                                        className="px-4 py-2 border border-gray-300 rounded-xl bg-white text-sm font-medium outline-none"
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value)}
                                    >
                                        <option value="All">All Status</option>
                                        <option value="Confirmed">Confirmed Only</option>
                                        <option value="Pending">Pending Only</option>
                                    </select>
                                </div>
                            </div>

                            {/* Mobile Card View (Visible on small screens) */}
                            <div className="md:hidden space-y-4 p-4 bg-gray-50">
                                {filteredBookings.map(booking => (
                                    <div key={booking.reservation_id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-gray-900">{booking.proposed_by}</div>
                                                <div className="text-xs text-gray-500 font-mono">{booking.reservation_id}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${booking.reservation_status.toLowerCase().includes('confirm') ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {booking.reservation_status.replace('Payment', '')}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 uppercase text-[10px] font-bold">Pax</span>
                                                <span className="font-semibold">{booking.participant_count} People</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 uppercase text-[10px] font-bold">Kavling</span>
                                                <span className={`font-semibold ${booking.kavling ? 'text-teal-700' : 'text-gray-400 italic'}`}>{booking.kavling || 'TBA'}</span>
                                            </div>
                                            <div className="col-span-2 flex flex-col border-t border-gray-100 pt-2 mt-1">
                                                <span className="text-gray-400 uppercase text-[10px] font-bold">Total</span>
                                                <span className="font-bold text-gray-800">{booking.jumlah_pembayaran}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            {booking.reservation_status.toLowerCase().includes('confirm') ? (
                                                <>
                                                    <button onClick={() => handleAssignKavling(booking.reservation_id)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200">
                                                        Edit Kavling
                                                    </button>
                                                    {booking.link_tiket && (
                                                        <a href={booking.link_tiket} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                                            <Download size={12} /> Ticket
                                                        </a>
                                                    )}
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleConfirmPayment(booking.reservation_id)}
                                                    disabled={processingId === booking.reservation_id}
                                                    className="w-full py-2 bg-teal-800 text-white rounded-lg text-xs font-bold hover:bg-teal-900 shadow-sm"
                                                >
                                                    {processingId === booking.reservation_id ? 'Wait...' : 'Confirm Payment'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="p-4">ID / Date</th>
                                            <th className="p-4">Name</th>
                                            <th className="p-4">Pax</th>
                                            <th className="p-4">Amount</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Kavling</th>
                                            <th className="p-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredBookings.map(booking => (
                                            <tr key={booking.reservation_id} className="hover:bg-gray-50 transition">
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-900">{booking.reservation_id}</div>
                                                    <div className="text-xs text-gray-400">{booking.date_submitted?.split(',')[0]}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium text-gray-900">{booking.proposed_by}</div>
                                                    <div className="text-xs text-gray-400">{booking.phone_number?.replace(/'/g, '')}</div>
                                                </td>
                                                <td className="p-4 center font-medium text-gray-900">{booking.participant_count}</td>
                                                <td className="p-4 font-medium text-gray-900">{booking.jumlah_pembayaran}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${booking.reservation_status.toLowerCase().includes('confirm')
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {booking.reservation_status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {booking.reservation_status.toLowerCase().includes('confirm') ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-900 font-mono font-medium">
                                                                {booking.kavling || 'TBA'}
                                                            </span>
                                                            <button
                                                                onClick={() => handleAssignKavling(booking.reservation_id)}
                                                                className="text-xs text-teal-600 hover:underline"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">Pending</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {booking.reservation_status.toLowerCase().includes('confirm') ? (
                                                        <div className="inline-flex gap-2">
                                                            {booking.link_tiket && (
                                                                <>
                                                                    <a
                                                                        href={booking.link_tiket}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-teal-600 hover:text-teal-800 p-2 bg-teal-50 rounded-lg"
                                                                        title="Download Ticket"
                                                                    >
                                                                        <Download size={18} />
                                                                    </a>
                                                                    <button
                                                                        onClick={() => handleRegenerateTicket(booking.reservation_id, booking.proposed_by)}
                                                                        disabled={processingId === booking.reservation_id}
                                                                        className="text-orange-600 hover:text-orange-800 p-2 bg-orange-50 rounded-lg"
                                                                        title="Regenerate Ticket"
                                                                    >
                                                                        <RefreshCw size={18} className={processingId === booking.reservation_id ? 'animate-spin' : ''} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleConfirmPayment(booking.reservation_id)}
                                                            disabled={processingId === booking.reservation_id}
                                                            className="bg-teal-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-900 transition shadow disabled:opacity-50"
                                                        >
                                                            {processingId === booking.reservation_id ? 'Wait...' : 'Confirm'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredBookings.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-400">No bookings found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'market' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800">Incoming Orders</h3>
                            <p className="text-sm text-gray-500">Orders from Marketplace (Sheet: Market OB)</p>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4 p-4 bg-gray-50">
                            {marketOrders.length === 0 ? (
                                <div className="text-center p-8 text-gray-400 bg-white rounded-xl border border-gray-100">
                                    {marketError ? <span className="text-red-500 font-bold">{marketError}</span> : 'No orders found.'}
                                </div>
                            ) : (
                                // SORTED: Newest First
                                [...marketOrders].reverse().filter(o => !o.status?.includes('Archived')).map((order, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-gray-900">{order.item_name || order['Item Name']}</div>
                                                <div className="text-xs text-gray-500 font-mono">#{order.order_id || order['Order ID']}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${(order.status || '').includes('Settled') ? 'bg-gray-100 text-gray-600' :
                                                (order.status || '').includes('Ready') ? 'bg-purple-100 text-purple-700' :
                                                    (order.status || '').includes('Received') ? 'bg-green-100 text-green-700' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {order.status || order['Status'] || 'Pending'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 uppercase text-[10px] font-bold">Qty</span>
                                                <span className="font-semibold">{order.quantity || order['Quantity']}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 uppercase text-[10px] font-bold">Total</span>
                                                <span className="font-semibold text-teal-700">{formatPrice(order.total_price || order['Total Price'])}</span>
                                            </div>
                                            <div className="col-span-2 flex flex-col border-t border-gray-100 pt-2 mt-1">
                                                <span className="text-gray-400 uppercase text-[10px] font-bold">Customer</span>
                                                <span className="font-semibold text-gray-800">{order.user_name || order['User Name']}</span>
                                                <a href={`https://wa.me/${(order.phone || order['Phone'] || '').toString().replace(/[^0-9]/g, '').replace(/^0/, '62').replace(/^8/, '628')}`} target="_blank" className="text-teal-600 hover:underline flex items-center gap-1 mt-1">
                                                    {order.phone || order['Phone']}
                                                </a>
                                            </div>

                                            {/* Proof Link */}
                                            {(order.payment_proof || order.proofUrl) && (
                                                <div className="col-span-2 mt-1 text-center">
                                                    {(order.payment_proof || order.proofUrl).toString().startsWith('Midtrans:') ? (
                                                        <span className="text-green-600 font-bold flex items-center justify-center gap-1 text-xs">
                                                            <CheckCircle size={12} /> Auto-Confirmed (Midtrans)
                                                        </span>
                                                    ) : (
                                                        <a href={order.payment_proof || order.proofUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold flex items-center justify-center gap-1">
                                                            <CheckCircle size={12} /> View Payment Proof
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Mobile Actions */}
                                        <div className="flex justify-end pt-2">
                                            {(order.status === 'Verifying Payment' || order.status === 'Pending Payment') && (
                                                <button
                                                    onClick={() => handleVerifyPayment(order.order_id || order['Order ID'])}
                                                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition">
                                                    Verify Payment
                                                </button>
                                            )}
                                            {(order.status === 'Item Received') && (
                                                <button
                                                    onClick={() => handleMarkSettled(order.order_id || order['Order ID'])}
                                                    className="w-full py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition">
                                                    Mark as Settled
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-4">ID / Date</th>
                                        <th className="p-4">Item</th>
                                        <th className="p-4">Seller</th>
                                        <th className="p-4">Customer</th>
                                        <th className="p-4">Amount</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {/* SORTED: Newest First */}
                                    {[...marketOrders].reverse().filter(o => !o.status?.includes('Archived')).map((order, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="p-4">
                                                <div className="font-bold text-gray-900">#{order.order_id || order['Order ID']}</div>
                                                <div className="text-xs text-gray-400">{new Date(order.date || order['Date']).toLocaleDateString()}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{order.item_name || order['Item Name']}</div>
                                                <div className="text-xs text-gray-500">{order.quantity || order['Quantity']} x {formatPrice(order.unit_price || order['Unit Price'])}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{order.supplier_name || order.supplier_email || order['Supplier Email'] || 'Unknown'}</div>
                                                {order.supplier_phone && (
                                                    <a
                                                        href={`https://wa.me/${order.supplier_phone.replace(/[^0-9]/g, '').replace(/^0/, '62').replace(/^8/, '628')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-teal-600 hover:underline flex items-center gap-1 mt-1"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /></svg>
                                                        Chat Seller
                                                    </a>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{order.user_name || order['User Name']}</div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-gray-400">{order.phone || order['Phone']}</span>
                                                    {(order.phone || order['Phone']) && (
                                                        <a
                                                            href={`https://wa.me/${(order.phone || order['Phone']).replace(/^0/, '62')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-green-600 hover:text-green-700 bg-green-50 p-1 rounded-full"
                                                            title="Chat on WhatsApp"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /></svg>
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-teal-700">{formatPrice(order.total_price || order['Total Price'])}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${(order.status || '').includes('Settled') ? 'bg-gray-100 text-gray-600' :
                                                    (order.status || '').includes('Ready') ? 'bg-purple-100 text-purple-700' :
                                                        (order.status || '').includes('Shipment') ? 'bg-blue-100 text-blue-700' :
                                                            (order.status || '').includes('Received') ? 'bg-green-100 text-green-700' :
                                                                'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {order.status || order['Status']}
                                                </span>
                                                {(order.resi || order['Resi'] || order['Tracking Number']) && (
                                                    <div className="flex flex-col gap-1 items-start mt-1">
                                                        <div className="text-xs text-blue-600 font-bold bg-blue-50 px-1 py-0.5 rounded border border-blue-100 inline-block">
                                                            🚚 {order.resi || order['Resi'] || order['Tracking Number']}
                                                        </div>
                                                        {(order.shipment_proof || order['Shipment Proof']) && (
                                                            <a href={order.shipment_proof || order['Shipment Proof']} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline">View Proof</a>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Proof Link Desktop */}
                                                {(order.payment_proof || order.proofUrl) && (
                                                    (order.payment_proof || order.proofUrl).toString().startsWith('Midtrans:') ? (
                                                        <span className="block text-xs text-green-600 font-bold mt-1 flex items-center gap-1">
                                                            <CheckCircle size={10} /> Auto-Confirmed
                                                        </span>
                                                    ) : (
                                                        <a href={order.payment_proof || order.proofUrl} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 hover:underline mt-1">View Proof</a>
                                                    )
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {(() => {
                                                    const status = (order.status || order['Status'] || '').toLowerCase();
                                                    const isPending = status.includes('pending') || status.includes('verifying');
                                                    const isPaid = status.includes('paid') && !status.includes('ready');
                                                    const isReady = status.includes('ready');
                                                    const isReceived = status.includes('received');
                                                    const isSettled = status.includes('settled') && !status.includes('archived');
                                                    const isCancelled = status.includes('cancelled');
                                                    const isRefunded = status.includes('refunded');

                                                    if (isPending) {
                                                        return (
                                                            <div className="flex flex-col gap-1">
                                                                <button
                                                                    onClick={() => handleVerifyPayment(order.order_id || order['Order ID'])}
                                                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition">
                                                                    Verify
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCancelOrder(order)}
                                                                    className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase">
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        );
                                                    }
                                                    if (isPaid) {
                                                        const isMidtrans = (order.payment_proof || order.proofUrl || '').toString().toLowerCase().includes('midtrans');
                                                        return (
                                                            <div className="flex flex-col gap-1">
                                                                {isMidtrans ? (
                                                                    <span className="text-xs text-purple-600 font-bold border border-purple-200 bg-purple-50 px-2 py-1.5 rounded-lg text-center">
                                                                        Auto-Notified
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleNotifySeller(order.order_id || order['Order ID'])}
                                                                        className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 transition"
                                                                        disabled={processingId === (order.order_id || order['Order ID'])}>
                                                                        {processingId === (order.order_id || order['Order ID']) ? 'Processing...' : 'Notify Seller'}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleCancelOrder(order)}
                                                                    className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase">
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        );
                                                    }
                                                    if (isReady) {
                                                        return (
                                                            <button
                                                                onClick={() => handleCancelOrder(order)}
                                                                className="text-red-500 hover:text-red-700 text-xs font-bold">
                                                                Cancel Order
                                                            </button>
                                                        );
                                                    }
                                                    if (isReceived) {
                                                        return (
                                                            <div className="flex flex-col gap-1">
                                                                <button
                                                                    onClick={() => handleMarkSettled(order.order_id || order['Order ID'])}
                                                                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition">
                                                                    Settle
                                                                </button>
                                                                <button
                                                                    onClick={() => handleArchiveOrder(order.order_id || order['Order ID'])}
                                                                    className="text-gray-400 hover:text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                                                                    Archive
                                                                </button>
                                                            </div>
                                                        );
                                                    }
                                                    if (isCancelled && !isRefunded) {
                                                        return (
                                                            <button
                                                                onClick={() => handleProcessRefund(order)}
                                                                className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-700 transition">
                                                                Process Refund
                                                            </button>
                                                        );
                                                    }
                                                    if (isSettled || isRefunded) {
                                                        return (
                                                            <button
                                                                onClick={() => handleArchiveOrder(order.order_id || order['Order ID'])}
                                                                className="text-gray-500 hover:text-gray-700 text-xs font-bold">
                                                                Archive
                                                            </button>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                    {marketOrders.length === 0 && (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">No marketplace orders found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}


                {activeTab === 'sellers' && (
                    <div className="space-y-6">
                        {/* Allowlist Section */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-4 text-gray-800">Seller Allowlist</h3>
                            <p className="text-sm text-gray-500 mb-4">Emails allowed to register as sellers.</p>
                            <div className="flex gap-2 mb-4">
                                <input
                                    className="border border-gray-300 px-4 py-2 rounded-xl flex-1 focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="Enter email to allow..."
                                    value={newAllowEmail}
                                    onChange={e => setNewAllowEmail(e.target.value)}
                                />
                                <button onClick={handleAddAllowlist} className="bg-teal-600 text-white px-6 rounded-xl font-bold hover:bg-teal-700">Add</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                                            <th className="p-3">Email</th>
                                            <th className="p-3">Added By</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {allowlist.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-900">{item.email}</td>
                                                <td className="p-3 text-gray-500">{item.added_by || item.addedBy || '-'}</td>
                                                <td className="p-3 text-gray-500">{new Date(item.added_at || item.addedAt).toLocaleDateString()}</td>
                                                <td className="p-3 text-right"><button onClick={() => handleDeleteAllowlist(item.email)} className="text-red-500 font-bold hover:text-red-700 text-xs uppercase">Delete</button></td>
                                            </tr>
                                        ))}
                                        {allowlist.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">No emails in allowlist</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Sellers List & Fees */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-4 text-gray-800">Registered Sellers & Fees</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                                            <th className="p-3">Seller</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Buyer Fee %</th>
                                            <th className="p-3">Seller Fee %</th>
                                            <th className="p-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sellerList.map(seller => (
                                            <tr key={seller.id} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="font-bold text-gray-900">{seller.fullName}</div>
                                                    <div className="text-xs text-gray-500">{seller.email}</div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${seller.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {seller.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono">{seller.buyerFeePercent || '0'}%</td>
                                                <td className="p-3 font-mono">{seller.sellerFeePercent || '0'}%</td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setEditingSeller(seller);
                                                            setFeeForm({
                                                                buyerFee: seller.buyerFeePercent || '0',
                                                                sellerFee: seller.sellerFeePercent || '0'
                                                            });
                                                        }}
                                                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-gray-200"
                                                    >
                                                        Edit Fees
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sellerList.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">No sellers found</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Verification Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">Verify Payment</h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 transition">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-sm text-blue-800 mb-1">Are you sure you want to verify this order?</p>
                                <p className="text-xs text-blue-600">This will notify the seller to ship the item.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-gray-500 text-xs font-bold uppercase">Customer</span>
                                    <span className="font-semibold text-gray-900">{selectedOrder.user_name || selectedOrder['User Name']}</span>
                                    <a href={`https://wa.me/${(selectedOrder.phone || selectedOrder['Phone'] || '').toString().replace(/[^0-9]/g, '').replace(/^0/, '62').replace(/^8/, '628')}`} target="_blank" className="text-teal-600 hover:underline flex items-center gap-1 text-xs mt-0.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        {selectedOrder.phone || selectedOrder['Phone']}
                                    </a>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs font-bold uppercase">Amount</span>
                                    <span className="font-semibold text-teal-700 text-lg">{selectedOrder.total_price || selectedOrder['Total Price']}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs font-bold uppercase">Order ID</span>
                                    <span className="font-mono text-gray-600">{selectedOrder.order_id || selectedOrder['Order ID']}</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <span className="block text-gray-500 text-xs font-bold uppercase mb-2">Payment Proof</span>
                                {selectedOrder.payment_proof || selectedOrder.proofUrl ? (
                                    (selectedOrder.payment_proof || selectedOrder.proofUrl).toString().startsWith('Midtrans:') ? (
                                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col items-center justify-center text-center">
                                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2 text-green-600">
                                                <CheckCircle size={24} />
                                            </div>
                                            <p className="font-bold text-green-800">Payment Auto-Confirmed</p>
                                            <p className="text-xs text-green-600 mt-1 font-mono break-all">
                                                {selectedOrder.payment_proof || selectedOrder.proofUrl}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                                            <img
                                                src={selectedOrder.payment_proof || selectedOrder.proofUrl}
                                                alt="Payment Proof"
                                                className="w-full h-auto max-h-[300px] object-contain"
                                            />
                                            <a
                                                href={selectedOrder.payment_proof || selectedOrder.proofUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                                    Open Full Image
                                                </span>
                                            </a>
                                        </div>
                                    )
                                ) : (
                                    <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 text-sm">
                                        No proof uploaded
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
                            {selectedOrder.supplier_phone && (
                                <a
                                    href={`https://wa.me/${selectedOrder.supplier_phone.replace(/^0/, '62')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-2 bg-green-100 text-green-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-200 transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /></svg>
                                    Contact Seller (Urgent)
                                </a>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => submitVerification(selectedOrder)}
                                    disabled={processingId === (selectedOrder.order_id || selectedOrder['Order ID'])}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                >
                                    {processingId === (selectedOrder.order_id || selectedOrder['Order ID']) ? 'Processing...' : 'Confirm Verification'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Order Modal */}
            {cancelModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
                            <h3 className="font-bold text-lg text-gray-800">Cancel Order</h3>
                            <button onClick={() => setCancelModal(null)} className="text-gray-400 hover:text-gray-600 transition">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                <p className="text-sm text-yellow-800 font-semibold mb-1">⚠️ This will cancel the order</p>
                                <p className="text-xs text-yellow-700">Order ID: {cancelModal.order_id || cancelModal['Order ID']}</p>
                                <p className="text-xs text-yellow-700">Customer: {cancelModal.user_name || cancelModal['User Name']}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Cancellation Reason</label>
                                <select
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none">
                                    <option value="seller_issue">Seller Can't Fulfill</option>
                                    <option value="buyer_request">Buyer Request</option>
                                    <option value="admin_action">Admin Action</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Notes (Optional)</label>
                                <textarea
                                    value={cancelNotes}
                                    onChange={(e) => setCancelNotes(e.target.value)}
                                    placeholder="e.g., Item out of stock, customer changed mind..."
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setCancelModal(null)}
                                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">
                                Back
                            </button>
                            <button
                                onClick={submitCancellation}
                                disabled={processingId === (cancelModal.order_id || cancelModal['Order ID'])}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">
                                {processingId === (cancelModal.order_id || cancelModal['Order ID']) ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Process Refund Modal */}
            {refundModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-50">
                            <h3 className="font-bold text-lg text-gray-800">Process Refund</h3>
                            <button onClick={() => setRefundModal(null)} className="text-gray-400 hover:text-gray-600 transition">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                <p className="text-sm text-blue-800 font-semibold mb-1">💰 Refund Details</p>
                                <p className="text-xs text-blue-700">Order ID: {refundModal.order_id || refundModal['Order ID']}</p>
                                <p className="text-xs text-blue-700">Customer: {refundModal.user_name || refundModal['User Name']}</p>
                                <p className="text-xs text-blue-700">Original Amount: {refundModal.total_price || refundModal['Total Price']}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Refund Amount (Rp)</label>
                                <input
                                    type="number"
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Refund Method</label>
                                <select
                                    value={refundMethod}
                                    onChange={(e) => setRefundMethod(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none">
                                    <option value="manual_transfer">Manual Bank Transfer</option>
                                    <option value="midtrans_api">Midtrans Refund API (Auto)</option>
                                </select>
                            </div>

                            {refundMethod === 'manual_transfer' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Proof URL (Optional)</label>
                                    <input
                                        type="url"
                                        value={refundProof}
                                        onChange={(e) => setRefundProof(e.target.value)}
                                        placeholder="https://drive.google.com/..."
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Upload receipt to Google Drive and paste link</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Notes (Optional)</label>
                                <textarea
                                    value={refundNotes}
                                    onChange={(e) => setRefundNotes(e.target.value)}
                                    placeholder="e.g., Refunded to account ending 1234..."
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setRefundModal(null)}
                                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button
                                onClick={submitRefund}
                                disabled={processingId === (refundModal.order_id || refundModal['Order ID'])}
                                className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition">
                                {processingId === (refundModal.order_id || refundModal['Order ID']) ? 'Processing...' : 'Process Refund'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Fees Modal */}
            {editingSeller && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <h3 className="font-bold text-lg mb-4 text-gray-900">Edit Fees: {editingSeller.fullName}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buyer Fee %</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full border border-gray-300 rounded-lg p-2"
                                    value={feeForm.buyerFee}
                                    onChange={e => setFeeForm({ ...feeForm, buyerFee: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seller Fee %</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full border border-gray-300 rounded-lg p-2"
                                    value={feeForm.sellerFee}
                                    onChange={e => setFeeForm({ ...feeForm, sellerFee: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2 justify-end mt-6">
                                <button onClick={() => setEditingSeller(null)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button onClick={handleUpdateFees} className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-md">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ icon, label, value, sub }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between mb-2">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">{label}</span>
            <div className="p-2 bg-gray-50 rounded-full">{icon}</div>
        </div>
        <div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 font-medium mt-1">{sub}</div>
        </div>
    </div>
);
