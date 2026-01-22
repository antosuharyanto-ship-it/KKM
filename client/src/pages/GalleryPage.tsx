import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Calendar, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { getDisplayImageUrl } from '../utils/imageHelper';

interface Event {
    event_id: string;
    activity: string;
    start_time: string;
    location: string;
    event_images: string;
    status: string;
    gallery_images?: string;
}

export const GalleryPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/events`)
            .then(res => {
                // Filter for 'Closed' or 'Completed' events, or those with gallery images
                const pastEvents = res.data.filter((e: Event) =>
                    e.status === 'Closed' ||
                    e.status === 'Completed' ||
                    (e.gallery_images && e.gallery_images.length > 0)
                );
                setEvents(pastEvents);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-teal-800">
            <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
            <p className="font-medium animate-pulse">Loading gallery...</p>
        </div>
    );

    return (
        <div className="pb-24 pt-4 px-4 md:px-0 bg-stone-50 min-h-screen">
            <div className="bg-gradient-to-r from-teal-800 to-teal-600 text-white p-8 rounded-3xl mb-8 shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Moments & Memories</h1>
                    <p className="text-teal-100 max-w-md">Explore the highlights from our past adventures and gatherings.</p>
                </div>
                <div className="absolute right-0 top-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <ImageIcon size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Memories Yet</h3>
                    <p className="text-gray-500 text-sm">Join our next event to be part of the story!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <div
                            key={event.event_id}
                            onClick={() => navigate(`/event/${event.event_id}`)}
                            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer border border-gray-100 flex flex-col h-full"
                        >
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={getDisplayImageUrl(event.event_images)}
                                    alt={event.activity}
                                    className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                    onError={(e) => e.currentTarget.src = 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=1000'}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                    <span className="text-white text-xs font-bold bg-black/30 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20">
                                        {event.status}
                                    </span>
                                </div>
                            </div>
                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex items-center gap-2 text-xs text-orange-600 font-bold uppercase tracking-wider mb-2">
                                    <Calendar size={14} />
                                    {event.start_time}
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 mb-2 leading-tight group-hover:text-teal-700 transition-colors">
                                    {event.activity}
                                </h3>
                                <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
                                    View photos and details from this event.
                                </p>
                                <div className="flex items-center gap-2 text-teal-600 font-bold text-sm mt-auto group-hover:translate-x-1 transition-transform">
                                    View Gallery <ArrowRight size={16} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
