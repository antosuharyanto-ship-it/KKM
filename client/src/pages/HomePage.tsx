import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapPin, Calendar, ArrowRight, Tent } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Import Hook
import { Link } from 'react-router-dom';
import { getDisplayImageUrl } from '../utils/imageHelper';
import { API_BASE_URL } from '../config';

interface EventData {
    event_id: string;
    activity: string; // Title
    start_time: string;
    location: string;
    event_images: string;
    status: string;
    description: string;
    type?: string;
}

export const HomePage: React.FC = () => {
    const { t } = useTranslation(); // Use Hook
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/events`)
            .then(res => setEvents(res.data))
            .catch(err => {
                console.error(err);
                // Show more detailed error for debugging
                const msg = err.response?.data?.error || err.message || 'Failed to connect';
                setError(`Failed to load events: ${msg}`);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=1000';
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-teal-800">
            <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
            <p className="font-medium animate-pulse">{t('common.loading')}</p>
        </div>
    );

    if (error) return (
        <div className="p-8 text-center bg-red-50 text-red-600 m-6 rounded-2xl border border-red-100 flex flex-col items-center">
            <Tent size={40} className="mb-2 opacity-50" />
            <p className="font-bold mb-1">Oops!</p>
            <p className="text-sm">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-white border border-red-200 rounded-full text-sm font-semibold hover:bg-red-50 transition">Retry</button>
        </div>
    );

    return (
        <div className="pb-20">
            {/* HERO SECTION WITH VIDEO BACKGROUND */}
            <div className="relative h-[90vh] md:h-[600px] w-full overflow-hidden mb-10 flex items-center justify-center">
                {/* Video Layer */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute top-0 left-0 w-full h-full object-cover z-0"
                >
                    <source src="/Anak2.mp4" type="video/mp4" />
                    {/* Fallback image if video fails or blocked */}
                    <img src="https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=2000" alt="Camping" className="w-full h-full object-cover" />
                </video>

                {/* Overlay Layer */}
                <div className="absolute inset-0 bg-black/40 z-10 bg-gradient-to-t from-stone-900 via-transparent to-black/30"></div>

                {/* Content Layer */}
                <div className="relative z-20 text-center text-white px-4 max-w-4xl mx-auto animate-in fade-in zoom-in duration-1000">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 mb-6 shadow-xl">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span className="text-sm font-bold tracking-wide text-green-100 uppercase">Live: Family Camping Season 2026</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight drop-shadow-lg leading-tight">
                        {t('home.welcome')}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed text-shadow">
                        {t('home.subtitle')}
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <button
                            onClick={() => document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-orange-500/30 hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            {t('home.explore_events')} <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* EVENTS SECTION */}
            <div id="events-section" className="px-6 md:px-8 max-w-7xl mx-auto mt-4 relative z-30">
                <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 p-6 md:p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <Tent className="text-teal-600" size={32} />
                                Upcoming Events
                            </h2>
                            <p className="text-gray-500 mt-2">Find your perfect getaway</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {events.length === 0 ? (
                            <div className="col-span-full text-center text-gray-500 py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <Tent size={48} className="mx-auto mb-4 text-gray-300" />
                                No events found. Check back later!
                            </div>
                        ) : events.map((event, idx) => {
                            const isAvailable = event.status?.toLowerCase() === 'available' && event.type !== 'Closed';
                            const CardContent = (
                                <>
                                    {/* Image */}
                                    <div className="h-64 relative overflow-hidden bg-gray-100">
                                        <img
                                            src={getDisplayImageUrl(event.event_images)}
                                            alt={event.activity}
                                            onError={handleImageError}
                                            className={`w-full h-full object-cover transition-transform duration-700 ${isAvailable ? 'group-hover:scale-110' : 'grayscale'}`}
                                        />
                                        <div className={`absolute top-4 right-4 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide flex items-center gap-1 ${isAvailable ? 'bg-white/95 text-teal-800' : 'bg-gray-200 text-gray-600'}`}>
                                            <span className={`w-2 h-2 rounded-full ${event.type === 'Closed' ? 'bg-red-500' : isAvailable ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                            {event.type || 'Unavailable'}
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

                                        {/* Content overlaid on image bottom */}
                                        <div className={`absolute bottom-0 left-0 right-0 p-6 text-white transform transition-transform duration-300 ${isAvailable ? 'translate-y-2 group-hover:translate-y-0' : ''}`}>
                                            <h3 className="text-2xl font-bold mb-2 leading-tight shadow-black drop-shadow-md">
                                                {event.activity || 'Untitled Event'}
                                            </h3>
                                            <div className="flex items-center text-white/90 text-sm mb-1">
                                                <Calendar size={16} className="mr-2 text-orange-400" />
                                                <span className="font-medium">{event.start_time || 'TBA'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Body */}
                                    <div className="p-6 pt-4">
                                        <div className="flex items-center text-gray-500 text-sm mb-6">
                                            <MapPin size={16} className="mr-2 text-teal-600" />
                                            <span className="truncate font-medium">{event.location || 'Location TBA'}</span>
                                        </div>

                                        <div className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 border ${isAvailable ? 'bg-teal-50 text-teal-900 group-hover:bg-teal-900 group-hover:text-white border-teal-100 group-hover:border-teal-900' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}>
                                            {isAvailable ? <>View Details <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></> : 'Event Closed'}
                                        </div>
                                    </div>
                                </>
                            );

                            return isAvailable ? (
                                <Link
                                    to={`/event/${event.event_id}`}
                                    key={idx}
                                    className="group block bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100"
                                >
                                    {CardContent}
                                </Link>
                            ) : (
                                <div key={idx} className="block bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 opacity-80">
                                    {CardContent}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* CTA Section Removed */}
        </div>
    );
};
