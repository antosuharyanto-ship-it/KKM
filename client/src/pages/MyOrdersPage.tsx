import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { Tag, CheckCircle, Upload } from 'lucide-react';
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
}

export const MyOrdersPage: React.FC = () => {
    // const { t } = useTranslation();
    const [orders, setOrders] = useState<MarketOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Upload Modal State
    const [uploadingOrder, setUploadingOrder] = useState<MarketOrder | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = () => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/api/my-market-orders`, { withCredentials: true })
            .then(res => setOrders(res.data))
            .catch(() => setError('Failed to load orders. Please login.'))
            .finally(() => setLoading(false));
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
            fetchOrders(); // Refresh status
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to upload proof.');
        } finally {
            setIsUploading(false);
        }
    };

    const confirmReceipt = async (orderId: string) => {
        if (!confirm('Are you sure you have received the item and it is in good condition? functionality check etc.')) return;

        try {
            await axios.post(`${API_BASE_URL}/api/marketplace/confirm-receipt`, { orderId }, { withCredentials: true });
            alert('Receipt confirmed. Thank you!');
            fetchOrders();
        } catch (err) {
            console.error(err);
            alert('Failed to confirm receipt.');
        }
    };

    // Helper for Status Color
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'verifying payment': return 'bg-blue-100 text-blue-800';
            case 'ready to ship': return 'bg-purple-100 text-purple-800';
            case 'shipped': return 'bg-indigo-100 text-indigo-800';
            case 'item received': return 'bg-green-100 text-green-800';
            case 'settled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative">
            <div className="bg-teal-800 text-white pt-10 pb-16 px-6 md:px-10 rounded-b-[2.5rem] shadow-lg mb-8">
                <h1 className="text-3xl font-bold">My Orders</h1>
                <p className="text-teal-100 text-sm">Track your marketplace purchases</p>
            </div>

            <div className="px-6 md:px-10 max-w-4xl mx-auto space-y-4">
                {loading && <p className="text-center text-gray-400">Loading orders...</p>}
                {error && <p className="text-center text-red-400">{error}</p>}

                {!loading && orders.length === 0 && (
                    <div className="text-center py-10">
                        <Tag className="mx-auto text-gray-300 mb-2" size={48} />
                        <p className="text-gray-500">No orders yet.</p>
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
                            <p className="text-sm text-gray-500">{order.quantity} x {order.unit_price}</p>
                            <p className="text-orange-600 font-bold mt-1">{order.total_price}</p>
                            <p className="text-xs text-gray-400 mt-2">{new Date(order.date).toLocaleDateString()}</p>
                        </div>

                        <div className="flex flex-col justify-center items-end gap-2">
                            {/* ACTION BUTTONS */}

                            {(order.status === 'Pending' || order.status === 'Pending Payment') && (
                                <button
                                    onClick={() => handleUploadClick(order)}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                    <Upload size={16} /> Upload Proof
                                </button>
                            )}

                            {(order.status === 'Ready to Ship' || order.status === 'Shipped') && (
                                <button
                                    onClick={() => confirmReceipt(order.order_id)}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 flex items-center gap-2">
                                    <CheckCircle size={16} /> Confirm Receipt
                                </button>
                            )}

                            {order.status === 'Item Received' && (
                                <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                                    <CheckCircle size={12} /> Completed
                                </p>
                            )}
                        </div>
                    </div>
                ))}

            </div>

            {/* Help / Contact Admin */}
            <div className="max-w-4xl mx-auto px-6 md:px-10 mt-8 text-center">
                <p className="text-gray-500 text-sm mb-3">Haven't received your item yet? Or need help?</p>
                <a
                    href="https://wa.me/628123456789"  // TODO: Replace with actual Admin number
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /></svg>
                    Contact Admin via WhatsApp
                </a>
            </div>

            {/* Upload Modal */}
            {uploadingOrder && (
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
        </div>
    );
};
