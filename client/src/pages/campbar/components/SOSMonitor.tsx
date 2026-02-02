import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, MapPin, CheckCircle, Bell } from 'lucide-react';
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
    const { id: tripId } = useParams<{ id: string }>();
    const [activeAlert, setActiveAlert] = useState<SOSAlert | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, setPermissionStatus] = useState<NotificationPermission>(Notification.permission);
    const vibrationInterval = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Audio setup
    useEffect(() => {
        audioRef.current = new Audio('/sos_alarm.mp3');
        audioRef.current.loop = true;
    }, []);

    const requestPermission = async () => {
        try {
            const status = await Notification.requestPermission();
            setPermissionStatus(status);

            // Also try to unlock audio on this click
            if (audioRef.current) {
                audioRef.current.play().then(() => {
                    audioRef.current?.pause();
                    audioRef.current!.currentTime = 0;
                }).catch(() => { }); // Expected if no src or other issues, just priming
            }
        } catch (err) {
            console.error('Permission request failed', err);
        }
    };

    // Polling Logic
    useEffect(() => {
        if (!tripId) return;

        const checkSOS = async () => {
            try {
                const alerts = await campbarApi.getActiveSOS(tripId);
                if (alerts && alerts.length > 0) {
                    const newest = alerts[0];
                    if (!activeAlert || activeAlert.id !== newest.id) {
                        setActiveAlert(newest);
                        startAlarm(newest);
                    }
                } else {
                    if (activeAlert) {
                        setActiveAlert(null);
                        stopAlarm();
                    }
                }
            } catch (err) {
                console.warn('[SOSMonitor] Poll failed', err);
            }
        };

        checkSOS();
        const interval = setInterval(checkSOS, 10000);

        return () => {
            clearInterval(interval);
            stopAlarm();
        };
    }, [tripId, activeAlert]);

    const startAlarm = (alertData: SOSAlert) => {
        // 1. Browser Vibration (May be blocked without gesture)
        if (navigator.vibrate) {
            const pattern = [200, 100, 200, 100, 200, 100, 500, 100, 500, 100, 500, 100, 200, 100, 200, 100, 200];
            navigator.vibrate(pattern);
            vibrationInterval.current = setInterval(() => navigator.vibrate(pattern), 5000);
        }

        // 2. Play Audio (If unlocked)
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Audio blocked:', e));
        }

        // 3. System Notification (Robust Fallback)
        if (Notification.permission === 'granted') {
            try {
                new Notification('SOS ALERT', {
                    body: `${alertData.user.fullName}: ${alertData.message}`,
                    tag: 'sos-alert',
                    // @ts-ignore
                    renotify: true,
                    // @ts-ignore
                    vibrate: [200, 100, 200, 100, 200, 100, 500, 100, 500, 100, 500, 100, 200]
                });
            } catch (e) {
                console.error('Notification failed', e);
            }
        }
    };

    const stopAlarm = () => {
        if (vibrationInterval.current) {
            clearInterval(vibrationInterval.current);
            vibrationInterval.current = null;
        }
        if (navigator.vibrate) navigator.vibrate(0);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const handleResolve = async () => {
        if (!tripId || !activeAlert) return;
        try {
            await campbarApi.resolveSOS(tripId, activeAlert.id);
            setActiveAlert(null);
            stopAlarm();
        } catch (err) {
            alert('Failed to resolve alert.');
        }
    };

    const handleOpenMap = () => {
        if (activeAlert?.location?.lat) {
            const { lat, lng } = activeAlert.location;
            window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
        }
    };

    // Render Logic

    // If we have an active alert, show the Full Screen Overlay
    if (activeAlert) {
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
                        <button onClick={handleOpenMap} className="bg-white text-red-900 py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-gray-100">
                            <MapPin size={24} />
                            VIEW MAP
                        </button>
                        <button onClick={handleResolve} className="bg-green-600 text-white py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-green-500">
                            <CheckCircle size={24} />
                            I'M SAFE
                        </button>
                    </div>
                    <div className="mt-4 text-center text-xs text-red-300">
                        Received at: {new Date(activeAlert.createdAt).toLocaleTimeString()}
                    </div>
                </div>
            </div>
        );
    }

    // Otherwise, check if we need to show the "Enable Permissions" banner
    // Only show if we haven't granted permission yet and we are in a trip context
    if (Notification.permission === 'default') {
        return (
            <div
                onClick={requestPermission}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-teal-600 text-white px-8 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3 cursor-pointer animate-bounce border-4 border-white/30"
            >
                <Bell size={32} />
                <div className="text-center">
                    <p className="font-bold text-lg">ENABLE SOS ALERTS</p>
                    <p className="text-xs opacity-90">Tap to allow vibration & sound</p>
                </div>
            </div>
        );
    }

    return null;
};
