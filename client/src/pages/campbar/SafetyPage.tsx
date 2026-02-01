import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, Battery, ChevronLeft, CheckCircle } from 'lucide-react';
import campbarApi from '../../utils/campbarApi';
import type { SOSAlert } from '../../utils/campbarTypes';

export const SafetyPage: React.FC = () => {
    const { tripId } = useParams<{ tripId: string }>();
    const navigate = useNavigate();

    // State
    const [location, setLocation] = useState<GeolocationPosition | null>(null);
    const [locationError, setLocationError] = useState<string>('');
    const [status, setStatus] = useState<'medical' | 'lost' | 'security' | 'other'>('other');
    const [message, setMessage] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [activationProgress, setActivationProgress] = useState(0);
    const [sosSent, setSosSent] = useState(false);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

    // Initial load and location tracking
    useEffect(() => {
        // Start watching location
        const watchId = navigator.geolocation.watchPosition(
            (pos) => setLocation(pos),
            (err) => setLocationError(err.message),
            { enableHighAccuracy: true }
        );

        // Get battery status if available
        if ('getBattery' in navigator) {
            (navigator as any).getBattery().then((battery: any) => {
                setBatteryLevel(Math.floor(battery.level * 100));
                battery.addEventListener('levelchange', () => {
                    setBatteryLevel(Math.floor(battery.level * 100));
                });
            });
        }

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // SOS Activation Logic (Hold to Trigger)
    useEffect(() => {
        let interval: any;
        if (isActivating) {
            interval = setInterval(() => {
                setActivationProgress(prev => {
                    if (prev >= 100) {
                        triggerSOS();
                        return 100;
                    }
                    return prev + 2; // ~1.5s to activate
                });
            }, 30);
        } else {
            setActivationProgress(0);
        }
        return () => clearInterval(interval);
    }, [isActivating]);

    const triggerSOS = async () => {
        setIsActivating(false);
        setActivationProgress(0);

        // Prepare alert data
        const alertData: SOSAlert = {
            location: location ? {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
                accuracy: location.coords.accuracy
            } : undefined,
            message: message || `EMERGENCY: I need help! Status: ${status}`,
            status,
            batteryLevel: batteryLevel || undefined,
            sentAt: new Date().toISOString()
        };

        // 1. Try Backend Push
        try {
            if (tripId) {
                await campbarApi.sendSOS(tripId, alertData);
                setSosSent(true);
            }
        } catch (error) {
            console.error('Failed to send SOS via internet:', error);
        }

        // 2. Fallback to SMS (Offline Mode)
        // Construct Google Maps link
        const mapsLink = location
            ? `https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`
            : 'Location Unavailable';

        const smsBody = `SOS ALERT: ${status.toUpperCase()}\n${message || 'I need help!'}\n\nMy Location:\n${mapsLink}\n\nBattery: ${batteryLevel}%`;

        // Open native SMS app
        window.location.href = `sms:?body=${encodeURIComponent(smsBody)}`;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center gap-4 bg-gray-800">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-700 rounded-full">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-red-500 flex items-center gap-2">
                    <AlertTriangle /> EMERGENCY MODE
                </h1>
            </div>

            <div className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full">

                {/* Location Status */}
                <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-gray-400 text-sm font-medium">YOUR LOCATION</h3>
                        {batteryLevel !== null && (
                            <div className={`flex items-center gap-1 text-xs ${batteryLevel < 20 ? 'text-red-500' : 'text-green-400'}`}>
                                <Battery size={14} /> {batteryLevel}%
                            </div>
                        )}
                    </div>
                    {location ? (
                        <div className="space-y-1">
                            <div className="text-2xl font-mono text-green-400">
                                {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin size={12} /> Accuracy: ±{Math.round(location.coords.accuracy)}m
                            </div>
                        </div>
                    ) : (
                        <div className="text-yellow-500 animate-pulse">
                            Acquiring GPS signal...
                        </div>
                    )}
                    {locationError && (
                        <div className="text-red-400 text-sm mt-2">
                            GPS Error: {locationError}
                        </div>
                    )}
                </div>

                {/* Status Selector */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {(['medical', 'lost', 'security', 'other'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={`p-4 rounded-xl border-2 font-bold capitalize transition-all ${status === s
                                    ? 'bg-red-600 border-red-500 text-white shadow-lg scale-105'
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* Message Input */}
                <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-2">ADDITIONAL MESSAGE (OPTIONAL)</label>
                    <textarea
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 transition"
                        rows={3}
                        placeholder="Describe your emergency..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>

                {/* The Big Red Button */}
                <div className="mt-auto mb-8 relative">
                    {/* Progress Ring */}
                    {isActivating && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-48 h-48 rounded-full border-4 border-red-500 opacity-30 animate-ping"></div>
                        </div>
                    )}

                    <button
                        onMouseDown={() => setIsActivating(true)}
                        onMouseUp={() => setIsActivating(false)}
                        onMouseLeave={() => setIsActivating(false)}
                        onTouchStart={() => setIsActivating(true)}
                        onTouchEnd={() => setIsActivating(false)}
                        className={`w-full h-32 rounded-3xl font-black text-2xl tracking-widest shadow-2xl transition-all transform active:scale-95 flex flex-col items-center justify-center gap-2 relative overflow-hidden ${isActivating ? 'bg-red-700 scale-95' : 'bg-red-600 hover:bg-red-500'
                            }`}
                        style={{
                            boxShadow: `0 0 ${activationProgress}px rgba(220, 38, 38, 0.8)`
                        }}
                    >
                        {/* Progress Background Fill */}
                        <div
                            className="absolute bottom-0 left-0 w-full bg-red-800 transition-all duration-75 ease-linear"
                            style={{ height: `${activationProgress}%` }}
                        ></div>

                        <span className="relative z-10 flex items-center gap-2">
                            <AlertTriangle size={32} />
                            {isActivating ? 'HOLD...' : 'HOLD FOR SOS'}
                        </span>
                        <span className="relative z-10 text-xs font-normal opacity-80">
                            3 Seconds to Activate
                        </span>
                    </button>
                </div>

                {/* Success Message */}
                {sosSent && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
                        <div className="bg-gray-800 p-8 rounded-3xl text-center border border-green-500 max-w-sm">
                            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">SOS SENT!</h2>
                            <p className="text-gray-400 mb-6">Your location and status have been broadcasted to the server.</p>
                            <button
                                onClick={() => setSosSent(false)}
                                className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-full text-white font-semibold w-full"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SafetyPage;
