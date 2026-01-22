
import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ScanLine, XCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Booking {
    reservation_id: string;
    event_name: string;
    proposed_by: string; // User Name
    participant_count: string;
    kavling: string; // Seat Allocation
    reservation_status: string; // Pending Payment / Confirmed
    check_in?: string; // Yes / No
}

export const ScannerPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isOfficer, setIsOfficer] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [bookingData, setBookingData] = useState<Booking | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [checkInStatus, setCheckInStatus] = useState<'idle' | 'processing' | 'success'>('idle');

    // 1. Check Officer Status
    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/officer/check`, { withCredentials: true })
            .then(() => setIsOfficer(true))
            .catch(() => {
                setIsOfficer(false);
            })
            .finally(() => setLoading(false));
    }, []);

    // 2. Initialize Scanner
    useEffect(() => {
        if (!isOfficer || scanResult) return;

        const scannerId = "reader";
        // Small timeout to ensure DOM is ready
        const timeout = setTimeout(() => {
            const scannerElement = document.getElementById(scannerId);
            if (!scannerElement) return;

            // Clear previous instance if any
            // (Html5QrcodeScanner handles cleanup poorly in React StrictMode sometimes, but let's try standard)
            const scanner = new Html5QrcodeScanner(
                scannerId,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render(
                (decodedText) => {
                    handleScanSuccess(decodedText);
                    scanner.clear(); // Stop scanning once found
                },
                () => {
                    // Ignore scan errors
                }
            );

            return () => {
                scanner.clear().catch(err => console.error("Failed to clear scanner", err));
            };
        }, 500);

        return () => clearTimeout(timeout);
    }, [isOfficer, scanResult]);

    const handleScanSuccess = async (ticketCode: string) => {
        setScanResult(ticketCode);
        setLoading(true);
        setErrorMsg('');

        try {
            const res = await axios.get(`${API_BASE_URL}/api/officer/scan/${ticketCode}`, { withCredentials: true });
            setBookingData(res.data);
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || 'Ticket not found or invalid.');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        if (!bookingData) return;
        setCheckInStatus('processing');

        try {
            await axios.post(`${API_BASE_URL}/api/officer/checkin`, {
                ticketCode: bookingData.reservation_id
            }, { withCredentials: true });

            setCheckInStatus('success');
        } catch (error: any) {
            console.error('Check-in failed', error);
            // Show specific error message from backend (e.g. "Kavling not assigned")
            const msg = error.response?.data?.message || 'Check-in failed';
            alert(msg);
            setCheckInStatus('idle');
        }
    };

    const resetScan = () => {
        setScanResult(null);
        setBookingData(null);
        setCheckInStatus('idle');
        setErrorMsg('');
    };

    if (loading && !scanResult) {
        return <div className="min-h-screen flex items-center justify-center">Loading scanner...</div>;
    }

    if (!isOfficer) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <XCircle size={64} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-gray-500 mb-6">You are not authorized to access this page.</p>
                <button onClick={() => navigate('/')} className="text-teal-600 font-bold hover:underline">
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 pt-safe">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
                <h1 className="font-bold text-lg flex items-center gap-2">
                    <ScanLine className="text-teal-600" /> Ticket Scanner
                </h1>
                <button onClick={() => navigate('/profile')} className="text-sm text-gray-500">Exit</button>
            </div>

            <div className="p-4 max-w-md mx-auto">
                {/* Scanner Area */}
                {!scanResult && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                        <div id="reader" className="overflow-hidden rounded-lg"></div>
                        <p className="text-center text-sm text-gray-500 mt-4">Point camera at QR Code</p>
                    </div>
                )}

                {/* Result Error */}
                {scanResult && errorMsg && (
                    <div className="bg-red-50 p-6 rounded-2xl text-center border border-red-100">
                        <XCircle size={48} className="text-red-500 mx-auto mb-3" />
                        <h3 className="font-bold text-red-800 mb-1">Invalid Ticket</h3>
                        <p className="text-red-600 text-sm mb-6">{errorMsg}</p>
                        <button
                            onClick={resetScan}
                            className="w-full bg-white border border-red-200 text-red-600 font-bold py-3 rounded-xl hover:bg-red-50 transition"
                        >
                            Scan Again
                        </button>
                    </div>
                )}

                {/* Booking Details */}
                {bookingData && (
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in zoom-in-95">
                        <div className="bg-teal-800 p-6 text-white text-center">
                            <h2 className="text-2xl font-bold">{bookingData.event_name}</h2>
                            <p className="text-teal-200 text-sm">ID: {bookingData.reservation_id}</p>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Check In Status Badge */}
                            <div className={`p-4 rounded-xl text-center border ${bookingData.check_in?.toLowerCase() === 'yes' || checkInStatus === 'success'
                                ? 'bg-green-50 border-green-100 text-green-700'
                                : 'bg-orange-50 border-orange-100 text-orange-700'
                                }`}>
                                <p className="text-xs uppercase font-bold tracking-wider mb-1">Check-in Status</p>
                                <p className="text-xl font-bold">
                                    {bookingData.check_in?.toLowerCase() === 'yes' || checkInStatus === 'success' ? 'ALREADY CHECKED IN' : 'NOT CHECKED IN'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 uppercase font-bold">Name</label>
                                    <p className="font-bold text-gray-900">{bookingData.proposed_by}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 uppercase font-bold">Pax</label>
                                    <p className="font-bold text-gray-900">{bookingData.participant_count} People</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 uppercase font-bold">Kavling</label>
                                    <p className="font-bold text-gray-900">{bookingData.kavling || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 uppercase font-bold">Payment</label>
                                    <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold ${(bookingData.reservation_status || '').toLowerCase().includes('confirm')
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}>
                                        {bookingData.reservation_status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 gap-3 grid">
                            {checkInStatus === 'success' || (bookingData.check_in?.toLowerCase() === 'yes') ? (
                                <button
                                    onClick={resetScan}
                                    className="w-full bg-teal-800 text-white font-bold py-4 rounded-xl hover:bg-teal-900 transition flex items-center justify-center gap-2"
                                >
                                    <ScanLine size={20} /> Scan Next
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={checkInStatus === 'processing'}
                                        className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-900/20 disabled:opacity-50"
                                    >
                                        {checkInStatus === 'processing' ? 'Processing...' : 'Confirm Check-in'}
                                    </button>

                                    <button
                                        onClick={resetScan}
                                        className="w-full text-gray-500 font-bold py-3 hover:bg-gray-200 rounded-xl transition"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
