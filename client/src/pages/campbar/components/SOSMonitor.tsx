import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, MapPin, CheckCircle } from 'lucide-react';
import campbarApi from '../../../utils/campbarApi';

interface SOSAlert {
    id: string;
    userId: string;
    message: string;
    location: any;
    user: {
        fullName: string;
        phone: string;
    };
    createdAt: string;
}

export const SOSMonitor: React.FC = () => {
    const { tripId } = useParams<{ tripId: string }>();
    const [activeAlert, setActiveAlert] = useState<SOSAlert | null>(null);
    const vibrationInterval = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Audio for non-vibrating devices (Optional but recommended)
    useEffect(() => {
        audioRef.current = new Audio('/sos_alarm.mp3'); // Placeholder if you have one, or skip
    }, []);

    // Polling Logic
    useEffect(() => {
        if (!tripId) return;

        const checkSOS = async () => {
            try {
                const alerts = await campbarApi.getActiveSOS(tripId);
                if (alerts && alerts.length > 0) {
                    const newest = alerts[0]; // Take the most recent active one
                    if (!activeAlert || activeAlert.id !== newest.id) {
                        setActiveAlert(newest);
                        startAlarm();
                    }
                } else {
                    if (activeAlert) {
                        setActiveAlert(null); // Cleared remotely
                        stopAlarm();
                    }
                }
            } catch (err) {
                // Silent fail on poll error
                console.warn('[SOSMonitor] Poll failed', err);
            }
        };

        // Initial check
        checkSOS();

        // Poll every 10 seconds
        const interval = setInterval(checkSOS, 10000);

        return () => {
            clearInterval(interval);
            stopAlarm();
        };
    }, [tripId, activeAlert]);

    const startAlarm = () => {
        // VIBRATION: SOS Pattern (... --- ...)
        if (navigator.vibrate) {
            // Vibrate immediately
            navigator.vibrate([
                200, 100, 200, 100, 200, 100, // S
                500, 100, 500, 100, 500, 100, // O
                200, 100, 200, 100, 200       // S
            ]);

            // Loop vibration every 3 seconds (length of pattern + pause)
            vibrationInterval.current = setInterval(() => {
                navigator.vibrate([
                    200, 100, 200, 100, 200, 100, // S
                    500, 100, 500, 100, 500, 100, // O
                    200, 100, 200, 100, 200       // S
                ]);
            }, 5000);
        }
    };

    const stopAlarm = () => {
        if (vibrationInterval.current) {
            clearInterval(vibrationInterval.current);
            vibrationInterval.current = null;
        }
        if (navigator.vibrate) {
            navigator.vibrate(0); // Stop immediately
        }
    };

    const handleResolve = async () => {
        if (!tripId || !activeAlert) return;
        try {
            await campbarApi.resolveSOS(tripId, activeAlert.id);
            setActiveAlert(null);
            stopAlarm();
        } catch (err) {
            alert('Failed to resolve alert. Check connection.');
        }
    };

    const handleOpenMap = () => {
        if (activeAlert?.location?.lat) {
            const { lat, lng } = activeAlert.location;
            window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
        }
    };

    if (!activeAlert) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-900/90 backdrop-blur-sm animate-pulse">
            <div className="bg-red-800 text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-4 border-red-500 animate-bounce-slow">

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="bg-red-600 p-4 rounded-full mb-4 animate-ping-slow">
                        <AlertTriangle size={64} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-wider mb-1">SOS ALERT</h2>
                    <p className="text-red-200 font-bold">EMERGENCY REPORTED</p>
                </div>

                <div className="bg-red-900/50 rounded-xl p-4 mb-6 border border-red-700">
                    <div className="text-sm text-red-300 uppercase font-semibold mb-1">Sender</div>
                    <div className="text-xl font-bold">{activeAlert.user.fullName}</div>
                    <div className="text-md opacity-80">{activeAlert.user.phone}</div>

                    <div className="my-3 border-t border-red-700"></div>

                    <div className="text-sm text-red-300 uppercase font-semibold mb-1">Message</div>
                    <div className="italic text-lg">"{activeAlert.message}"</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleOpenMap}
                        className="bg-white text-red-900 py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-gray-100"
                    >
                        <MapPin size={24} />
                        VIEW MAP
                    </button>
                    <button
                        onClick={handleResolve}
                        className="bg-green-600 text-white py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-green-500"
                    >
                        <CheckCircle size={24} />
                        I'M SAFE / RESOLVE
                    </button>
                </div>

                <div className="mt-4 text-center text-xs text-red-300">
                    Received at: {new Date(activeAlert.createdAt).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};
