import React, { useEffect, useState } from 'react';
import { Mountain, Compass } from 'lucide-react';

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onFinish, 500); // Wait for exit animation
        }, 2500); // 2.5s duration

        return () => clearTimeout(timer);
    }, [onFinish]);

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 z-[100] bg-teal-900 flex flex-col items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative">
                {/* Ping Animation */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-teal-500 rounded-full opacity-20 animate-ping"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-teal-600 rounded-full opacity-30 animate-pulse"></div>

                {/* Icon */}
                <div className="relative z-10 bg-white p-4 rounded-full shadow-2xl animate-in fade-in zoom-in duration-700">
                    <img src="/logo.jpg" alt="KKM Logo" className="w-24 h-24 object-contain" />
                </div>
            </div>

            <div className="mt-8 text-center space-y-2 animate-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-forwards opacity-0" style={{ animationFillMode: 'forwards' }}>
                <h1 className="text-3xl font-bold text-white tracking-widest uppercase">Kemah Keluarga Muslim</h1>
                <p className="text-teal-200 text-sm tracking-wide flex items-center gap-2 justify-center">
                    <Compass size={14} /> Explore. Camp. Connect. <Mountain size={14} />
                </p>
            </div>
        </div>
    );
};
