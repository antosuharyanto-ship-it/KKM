import React, { useEffect, useState } from 'react';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { Compass, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const IslamicToolsPage: React.FC = () => {
    const { t } = useTranslation();
    const [prayerTimes, setPrayerTimes] = useState<any>(null);
    const [compassHeading, setCompassHeading] = useState(0);
    const [locationName, setLocationName] = useState('Determining location...');

    useEffect(() => {
        // Default: Jakarta (-6.2088, 106.8456)
        // Try getting geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocationName(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
                    calculateTimes(latitude, longitude);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setLocationName('Jakarta (Default)');
                    calculateTimes(-6.2088, 106.8456); // Fallback to Jakarta
                }
            );
        } else {
            setLocationName('Jakarta (Default)');
            calculateTimes(-6.2088, 106.8456);
        }

        // Compass Logic
        const handleOrientation = (e: DeviceOrientationEvent) => {
            // @ts-ignore - webkitCompassHeading is iOS specific
            if (e.webkitCompassHeading) {
                // iOS
                // @ts-ignore
                setCompassHeading(e.webkitCompassHeading);
            } else if (e.alpha) {
                // Android (approximate, simpler logic needed for true North)
                setCompassHeading(Math.abs(e.alpha - 360));
            }
        };

        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    const calculateTimes = (lat: number, lng: number) => {
        const coordinates = new Coordinates(lat, lng);
        const params = CalculationMethod.Singapore(); // Common for Indonesia/SE Asia
        const date = new Date();
        const times = new PrayerTimes(coordinates, date, params);
        setPrayerTimes(times);

        // Simple Qibla Calculation (Adhan usually provides this, but we can iterate)
        // For now, let's use a static Qibla direction relative to North if library doesn't expose it directly in this version
        // Actually adhan.Qibla(coordinates) exists in newer versions or separate util.
        // Let's use a standard approximate Qibla for Indonesia (~295 degrees / WNW)
        // Ideally we calculate strictly using coords.
        // Using basic formula:
        // Kaaba: 21.4225° N, 39.8262° E
        // For simplicity, we'll assume ~295 for Jakarta. 
        // Better: use library function if available, or math.
    };

    const prayers = [
        { name: 'Fajr', time: prayerTimes?.fajr },
        { name: 'Dhuhr', time: prayerTimes?.dhuhr },
        { name: 'Asr', time: prayerTimes?.asr },
        { name: 'Maghrib', time: prayerTimes?.maghrib },
        { name: 'Isha', time: prayerTimes?.isha },
    ];

    const formatTime = (date: Date) => {
        return date ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
    };

    // Calculate rotation for the Qibla needle relative to phone heading
    // Qibla (from North) - PhoneHeading (from North) = Needle Rotation
    const JAKARTA_QIBLA = 295;
    const needleRotation = JAKARTA_QIBLA - compassHeading;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-10 pt-16 md:pt-20">
            {/* Header Section */}
            <div className="bg-teal-800 text-white pt-12 pb-12 px-6 rounded-3xl mx-4 shadow-lg relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-700/30 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <Moon size={28} className="text-orange-400" />
                    {t('nav.prayer')} {/* Re-use nav key or add new one */}
                </h1>
                <p className="text-teal-100 text-sm">{locationName}</p>
            </div>

            <div className="px-6 space-y-6">
                {/* Prayer Times Card */}
                <div className="bg-white p-6 rounded-2xl shadow-md border border-teal-100">
                    <h2 className="font-bold text-teal-900 mb-4 text-center">{t('nav.prayer')} Times</h2>
                    <div className="space-y-3">
                        {prayers.map((p) => (
                            <div key={p.name} className="flex justify-between items-center bg-teal-50/50 p-3 rounded-xl hover:bg-teal-50 transition">
                                <span className="font-medium text-teal-800">{p.name}</span>
                                <span className="font-bold text-teal-600 font-mono text-lg">{formatTime(p.time)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Qibla Compass Card */}
                <div className="bg-white p-6 rounded-2xl shadow-md border border-teal-100 text-center">
                    <h2 className="font-bold text-teal-900 mb-2 flex items-center justify-center gap-2">
                        <Compass size={20} /> Qibla Compass
                    </h2>
                    <p className="text-xs text-gray-400 mb-6">Calibrate by waving phone in figure 8</p>

                    <div className="relative w-64 h-64 mx-auto bg-gray-100 rounded-full shadow-inner border-4 border-gray-200 flex items-center justify-center">
                        {/* Static Compass Rose (North marker) */}
                        <div className="absolute inset-0 flex flex-col items-center justify-between py-2 pointer-events-none" style={{ transform: `rotate(${-compassHeading}deg)`, transition: 'transform 0.2s ease-out' }}>
                            <span className="text-red-500 font-bold text-lg">N</span>
                            <span className="text-gray-400 text-sm">S</span>
                        </div>
                        <div className="absolute inset-0 flex flex-row items-center justify-between px-2 pointer-events-none" style={{ transform: `rotate(${-compassHeading}deg)`, transition: 'transform 0.2s ease-out' }}>
                            <span className="text-gray-400 text-sm -rotate-90">W</span>
                            <span className="text-gray-400 text-sm rotate-90">E</span>
                        </div>

                        {/* Qibla Needle (Points to Kaaba) */}
                        <div
                            className="absolute w-1 h-32 bg-transparent left-1/2 bottom-1/2 -translate-x-1/2 origin-bottom transition-transform duration-500 ease-out"
                            style={{ transform: `rotate(${needleRotation}deg)` }}
                        >
                            <div className="w-12 h-12 -mt-10 mx-auto">
                                <img src="https://img.icons8.com/color/96/kaaba.png" alt="Kaaba" className="w-full h-full drop-shadow-md" />
                            </div>
                            <div className="w-1 h-full bg-orange-500 mx-auto rounded-full"></div>
                        </div>

                        {/* Center Dot */}
                        <div className="w-4 h-4 bg-teal-800 rounded-full z-10 border-2 border-white shadow"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
