import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Tent, Mountain, Users, Calendar, AlertTriangle } from 'lucide-react';
import campbarApi from '../../utils/campbarApi';
import type { Trip, TripFilters } from '../../utils/campbarTypes';
import { HowItWorks } from './components/HowItWorks';

export const CampBarPage: React.FC = () => {
    useTranslation();
    const navigate = useNavigate();

    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<TripFilters>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTrips();
    }, [filters]);

    const fetchTrips = async () => {
        setLoading(true);
        try {
            const data = await campbarApi.getTrips({ ...filters, search: searchTerm });
            setTrips(data);
        } catch (error) {
            console.error('[CampBar] Failed to fetch trips:', error);
            // Handle unauthorized - redirect to login
            if ((error as any)?.response?.status === 401) {
                alert('Please login to view trips');
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setFilters(prev => ({ ...prev, search: searchTerm }));
    };

    const getDifficultyBadge = (difficulty: string) => {
        const colors = {
            easy: 'bg-green-100 text-green-700',
            moderate: 'bg-yellow-100 text-yellow-700',
            hard: 'bg-orange-100 text-orange-700',
            expert: 'bg-red-100 text-red-700'
        };
        return colors[difficulty as keyof typeof colors] || colors.moderate;
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            planning: 'bg-blue-100 text-blue-700',
            confirmed: 'bg-green-100 text-green-700',
            ongoing: 'bg-purple-100 text-purple-700',
            completed: 'bg-gray-100 text-gray-700',
            cancelled: 'bg-red-100 text-red-700'
        };
        return colors[status as keyof typeof colors] || colors.planning;
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'TBD';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-10">
            {/* Header Section */}
            <div className="relative bg-gradient-to-br from-emerald-800 via-teal-700 to-green-900 text-white pt-12 pb-20 px-6 md:px-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>

                <div className="max-w-6xl mx-auto relative z-10 text-center mb-12">
                    <div className="bg-emerald-900/40 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-yellow-300/20 shadow-2xl">
                        <Tent className="mx-auto mb-4" size={48} />
                        <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-wide">CampBar</h1>
                        <p className="text-yellow-100 text-lg mb-2">Plan Your Next Camping Adventure</p>
                        <p className="text-sm text-gray-300">Coordinate dates, gear, and logistics with fellow campers</p>
                        <div className="h-1 w-24 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mt-6"></div>
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition group">
                        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                            <Calendar className="text-yellow-400" size={32} />
                        </div>
                        <h3 className="font-bold text-center mb-2 text-lg">Date Voting</h3>
                        <p className="text-xs text-center text-gray-300">Vote on dates that work for everyone</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition group">
                        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                            <Mountain className="text-yellow-400" size={32} />
                        </div>
                        <h3 className="font-bold text-center mb-2 text-lg">Gear Coordination</h3>
                        <p className="text-xs text-center text-gray-300">Organize who brings what equipment</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition group">
                        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                            <Users className="text-yellow-400" size={32} />
                        </div>
                        <h3 className="font-bold text-center mb-2 text-lg">Group Messaging</h3>
                        <p className="text-xs text-center text-gray-300">Chat with your trip members</p>
                    </div>
                    {/* Panic Button Card */}
                    <div
                        onClick={() => navigate('/campbar/trips/safety')}
                        className="bg-red-500/20 backdrop-blur-md rounded-2xl p-6 border border-red-500/40 hover:bg-red-500/30 transition group cursor-pointer"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition animate-pulse">
                            <AlertTriangle className="text-red-400" size={32} />
                        </div>
                        <h3 className="font-bold text-center mb-2 text-lg text-red-100">SOS / Panic Button</h3>
                        <p className="text-xs text-center text-red-200">Emergency signal & Location sharing</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto relative z-10">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by destination..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:bg-white/20 transition shadow-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    </div>
                </div>
            </div>

            {/* How It Works Section */}
            <HowItWorks />

            {/* Filters & Create Button */}
            <div className="px-6 md:px-10 -mt-8 mb-6 max-w-6xl mx-auto relative z-20">
                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    {/* Filter Pills */}
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {/* Status Filter */}
                        <select
                            value={filters.status || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any || undefined }))}
                            className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                        >
                            <option value="">All Status</option>
                            <option value="planning">Planning</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                        </select>

                        {/* Difficulty Filter */}
                        <select
                            value={filters.difficulty || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value as any || undefined }))}
                            className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                        >
                            <option value="">All Difficulty</option>
                            <option value="easy">Easy</option>
                            <option value="moderate">Moderate</option>
                            <option value="hard">Hard</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>

                    {/* Create Trip Button */}
                    <button
                        onClick={() => navigate('/campbar/trips/new')}
                        className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-full font-semibold shadow-lg hover:bg-teal-700 transition active:scale-95"
                    >
                        <Plus size={20} />
                        Create Trip
                    </button>
                </div>
            </div>

            {/* Trip Grid */}
            <div className="px-6 md:px-10 max-w-7xl mx-auto">
                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading trips...</div>
                ) : trips.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="bg-white rounded-3xl p-12 border border-dashed border-gray-300">
                            <Tent size={64} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="text-xl font-bold text-gray-700 mb-2">No trips found</h3>
                            <p className="text-gray-500 mb-6">Be the first to create a camping trip!</p>
                            <button
                                onClick={() => navigate('/campbar/trips/new')}
                                className="px-6 py-3 bg-teal-600 text-white rounded-full font-semibold hover:bg-teal-700 transition"
                            >
                                Create Your First Trip
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trips.map((trip) => (
                            <div
                                key={trip.id}
                                onClick={() => navigate(`/campbar/trips/${trip.id}`)}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-teal-200 transition cursor-pointer group"
                            >
                                {/* Header with badges */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-teal-700 transition">
                                            {trip.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                            <Mountain size={14} />
                                            {trip.destination}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDifficultyBadge(trip.difficulty)}`}>
                                        {trip.difficulty}
                                    </span>
                                </div>

                                {/* Dates */}
                                <div className="mb-4 text-sm text-gray-600">
                                    <Calendar size={14} className="inline mr-1" />
                                    {trip.datesConfirmed
                                        ? `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`
                                        : 'Dates to be decided'
                                    }
                                </div>

                                {/* Description preview */}
                                {trip.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{trip.description}</p>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            {trip.currentParticipants}/{trip.maxParticipants} joined
                                        </span>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(trip.status)}`}>
                                        {trip.status}
                                    </span>
                                </div>

                                {/* Estimated Cost (if available) */}
                                {trip.estimatedCost && (
                                    <div className="mt-3 text-sm text-teal-700 font-semibold">
                                        Est. cost: {trip.estimatedCost}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* Persistent SOS Floating Button */}
            <button
                onClick={() => navigate('/campbar/trips/safety')}
                className="fixed bottom-24 left-6 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg border-4 border-red-500/30 animate-pulse transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                aria-label="Emergency SOS"
            >
                <AlertTriangle size={28} fill="currentColor" />
            </button>
        </div>
    );
};

export default CampBarPage;
