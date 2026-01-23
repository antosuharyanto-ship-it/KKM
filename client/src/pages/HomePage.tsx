import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapPin, Calendar, ArrowRight, Tent } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Import Hook
import { Link } from 'react-router-dom';
import { getDisplayImageUrl } from '../utils/imageHelper';
import { API_BASE_URL } from '../config';

interface EventData {
    id: string;
    activity: string; // Title
    start_time: string;
    location: string;
    event_images: string;
    status: string;
    description: string;
    type?: string;
    registration_link?: string;
    gallery_images?: string;
}

export const HomePage: React.FC = () => {
    const { t } = useTranslation();
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/events`)
            .then(res => setEvents(res.data))
            .catch(err => {
                console.error(err);
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

    // --- FILTER LOGIC ---
    const featuredEvents = events.filter(e => e.status?.toLowerCase().includes('open'));
    const otherEvents = events.filter(e => !e.status?.toLowerCase().includes('open'));

    return (
        <div className="pb-20">
            {/* HERO SECTION */}
            <div className="relative h-[90vh] md:h-[600px] w-full overflow-hidden mb-10 flex items-center justify-center">
                <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0">
                    <source src="/Anak2.mp4" type="video/mp4" />
                    <img src="https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=2000" alt="Camping" className="w-full h-full object-cover" />
                </video>
                <div className="absolute inset-0 bg-black/40 z-10 bg-gradient-to-t from-stone-900 via-transparent to-black/30"></div>

                <div className="relative z-20 text-center text-white px-4 max-w-4xl mx-auto animate-in fade-in zoom-in duration-1000">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 mb-6 shadow-xl">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span className="text-sm font-bold tracking-wide text-green-100 uppercase">Live: Family Camping Season 2026</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight drop-shadow-lg leading-tight">{t('home.welcome')}</h1>
                    <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed text-shadow">{t('home.subtitle')}</p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <button onClick={() => document.getElementById('featured-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-orange-500/30 hover:-translate-y-1 flex items-center justify-center gap-2">
                            {t('home.explore_events')} <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* FEATURED SECTION (OPEN EVENTS) */}
            {featuredEvents.length > 0 && (
                <div id="featured-section" className="px-6 md:px-8 max-w-7xl mx-auto mt-10 mb-20 relative z-30">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-teal-100 rounded-2xl text-teal-700">
                            <Tent size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">Open for Registration</h2>
                            <p className="text-gray-500">Don't miss out on our upcoming adventures</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {featuredEvents.map((event, idx) => (
                            <Link to={`/event/${event.id}`} key={idx} className="group block bg-white rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 ring-4 ring-white/50">
                                <div className="h-80 relative overflow-hidden">
                                    <img src={getDisplayImageUrl(event.event_images)} alt={event.activity} onError={handleImageError} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold shadow-lg text-teal-800 flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                                        OPEN NOW
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                                        <h3 className="text-3xl font-bold mb-3 leading-tight">{event.activity}</h3>
                                        <div className="flex flex-wrap gap-4 text-sm font-medium text-white/90">
                                            <div className="flex items-center bg-white/10 px-3 py-1 rounded-full"><Calendar size={16} className="mr-2" /> {event.start_time || 'TBA'}</div>
                                            <div className="flex items-center bg-white/10 px-3 py-1 rounded-full"><MapPin size={16} className="mr-2" /> {event.location || 'Location TBA'}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-teal-50/50 to-white">
                                    <div className="w-full py-4 bg-teal-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 group-hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200">
                                        Book Now <ArrowRight size={20} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ARCHIVE / OTHER SECTION */}
            {otherEvents.length > 0 && (
                <div className="px-6 md:px-8 max-w-7xl mx-auto mb-20">
                    <div className="flex items-center justify-between mb-8 border-t border-gray-100 pt-10">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Event Archive & Upcoming</h2>
                            <p className="text-gray-400 text-sm mt-1">Past memories and future plans</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {otherEvents.map((event, idx) => {
                            const status = event.status?.trim() || 'Unavailable';
                            // Normalize status to handle legacy 'Finished' or new 'Closed'
                            const isClosed = status === 'Closed' || status === 'Finished';
                            const isFull = status === 'Full Booked';
                            const isComingSoon = status === 'Coming Soon';

                            // Determine Badge Color
                            let badgeColor = 'bg-gray-100 text-gray-600';
                            let badgeText = status;

                            if (isClosed) { badgeColor = 'bg-gray-800 text-white'; badgeText = 'CLOSED'; }
                            else if (isFull) { badgeColor = 'bg-red-100 text-red-700'; badgeText = 'FULL BOOKED'; }
                            else if (isComingSoon) { badgeColor = 'bg-amber-100 text-amber-800'; badgeText = 'COMING SOON'; }

                            // Action Button Logic
                            // If Closed/Finished AND has external link (e.g. Gallery), show "View Gallery"
                            const hasGallery = isClosed && event.gallery_images;

                            return (
                                <div key={idx} className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col h-full">
                                    <div className="h-48 relative overflow-hidden bg-gray-200">
                                        <img src={getDisplayImageUrl(event.event_images)} alt={event.activity} onError={handleImageError} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isClosed ? 'grayscale' : ''}`} />
                                        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${badgeColor}`}>
                                            {badgeText}
                                        </div>
                                    </div>

                                    <div className="p-5 flex flex-col flex-grow">
                                        <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">{event.activity}</h3>
                                        <div className="text-xs text-gray-500 space-y-1 mb-4 flex-grow">
                                            <div className="flex items-center"><Calendar size={12} className="mr-2" /> {event.start_time || 'TBA'}</div>
                                            <div className="flex items-center"><MapPin size={12} className="mr-2" /> {event.location || 'TBA'}</div>
                                        </div>

                                        {/* Action Button */}
                                        {hasGallery ? (
                                            <Link to={`/event/${event.id}`} className="w-full py-2 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors">
                                                View Gallery <ArrowRight size={14} />
                                            </Link>
                                        ) : (
                                            <Link to={`/event/${event.id}`} className="w-full py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-gray-200 hover:text-gray-600 transition-colors">
                                                {isFull ? 'Waitlist' : isComingSoon ? 'Details' : 'View Details'}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Fallback if absolutely no events */}
            {events.length === 0 && (
                <div className="text-center text-gray-500 py-20 bg-gray-50 mx-6 rounded-3xl border border-dashed border-gray-200">
                    <Tent size={48} className="mx-auto mb-4 text-gray-300" />
                    No events found. Check back later!
                </div>
            )}
        </div>
    );
};
