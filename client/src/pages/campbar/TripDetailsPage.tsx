import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Users, Calendar, MapPin, DollarSign, AlertCircle, Play, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import campbarApi from '../../utils/campbarApi';
import type { Trip } from '../../utils/campbarTypes';
import DateVotingSection from './components/DateVotingSection.tsx';
import GearSection from './components/GearSection.tsx';
import MessagingSection from './components/MessagingSection.tsx';
import ParticipantsList from './components/ParticipantsList.tsx';
import TripProgressBar from './components/TripProgressBar.tsx';
import ActionGuidance from './components/ActionGuidance.tsx';

export const TripDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (id) {
            fetchTripDetails();
        }
        fetchCurrentUser();
    }, [id]);

    const fetchCurrentUser = async () => {
        try {
            // Fetch current user info from auth endpoint
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentUserId(data.id);
            }
        } catch (error) {
            console.error('[TripDetails] Failed to fetch user:', error);
        }
    };

    const fetchTripDetails = async () => {
        if (!id) return;

        setLoading(true);
        try {
            const data = await campbarApi.getTrip(id);
            setTrip(data);
        } catch (error: any) {
            console.error('[TripDetails] Error:', error);
            if (error.response?.status === 401) {
                alert('Please login to view trip details');
                navigate('/');
            } else if (error.response?.status === 404) {
                alert('Trip not found');
                navigate('/campbar');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (status: 'ongoing' | 'completed') => {
        if (!id || !trip) return;
        const confirmMsg = status === 'ongoing' ? 'Start this trip?' : 'Mark trip as completed?';
        if (!window.confirm(confirmMsg)) return;

        setActionLoading(true);
        try {
            await campbarApi.updateTripStatus(id, status);
            await fetchTripDetails();
        } catch (error: any) {
            const message = error.response?.data?.error || 'Failed to update status';
            alert(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleJoinTrip = async () => {
        if (!id || !trip) return;

        setActionLoading(true);
        try {
            await campbarApi.joinTrip(id);
            alert('Successfully joined trip!');
            fetchTripDetails(); // Refresh
        } catch (error: any) {
            const message = error.response?.data?.error || 'Failed to join trip';
            alert(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLeaveTrip = async () => {
        if (!id || !trip) return;

        const confirm = window.confirm('Are you sure you want to leave this trip?');
        if (!confirm) return;

        setActionLoading(true);
        try {
            await campbarApi.leaveTrip(id);
            alert('Left trip');
            navigate('/campbar');
        } catch (error: any) {
            const message = error.response?.data?.error || 'Failed to leave trip';
            alert(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmAttendance = async () => {
        if (!id || !trip) return;

        setActionLoading(true);
        try {
            await campbarApi.confirmAttendance(id);
            alert('Attendance confirmed! See you there!');
            fetchTripDetails();
        } catch (error: any) {
            const message = error.response?.data?.error || 'Failed to confirm attendance';
            alert(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelTrip = async () => {
        if (!id || !trip) return;

        const confirm = window.confirm('Are you sure you want to cancel this trip? This cannot be undone.');
        if (!confirm) return;

        setActionLoading(true);
        try {
            await campbarApi.cancelTrip(id);
            alert('Trip cancelled');
            fetchTripDetails();
        } catch (error: any) {
            const message = error.response?.data?.error || 'Failed to cancel trip';
            alert(message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-400">Loading trip details...</div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-red-500">Trip not found</div>
            </div>
        );
    }

    const isOrganizer = trip.organizerId === currentUserId;
    const isParticipant = trip.participants?.some(p => p.userId === currentUserId);
    const isFull = trip.currentParticipants >= trip.maxParticipants;

    const getDifficultyColor = () => {
        const colors = {
            easy: 'bg-green-100 text-green-700 border-green-200',
            moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            hard: 'bg-orange-100 text-orange-700 border-orange-200',
            expert: 'bg-red-100 text-red-700 border-red-200'
        };
        return colors[trip.difficulty] || colors.moderate;
    };

    const getStatusColor = () => {
        const colors = {
            planning: 'bg-blue-100 text-blue-700',
            confirmed: 'bg-green-100 text-green-700',
            ongoing: 'bg-purple-100 text-purple-700',
            completed: 'bg-gray-100 text-gray-700',
            cancelled: 'bg-red-100 text-red-700'
        };
        return colors[trip.status] || colors.planning;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-teal-700 to-emerald-800 text-white pt-8 pb-16 px-6 md:px-10">
                <div className="max-w-5xl mx-auto">
                    <button
                        onClick={() => navigate('/campbar')}
                        className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition"
                    >
                        <ArrowLeft size={20} />
                        Back to Trips
                    </button>

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">{trip.title}</h1>
                            <p className="text-teal-100 flex items-center gap-2 mb-4">
                                <MapPin size={18} />
                                {trip.destination}
                            </p>
                            {trip.description && (
                                <p className="text-gray-200 text-sm max-w-2xl">{trip.description}</p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getDifficultyColor()}`}>
                                {trip.difficulty}
                            </span>
                            <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor()}`}>
                                {trip.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* UX Guidance System */}
            <div className="max-w-3xl mx-auto px-6 md:px-10 -mt-10 relative z-10">
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <TripProgressBar status={trip.status} />
                    <ActionGuidance trip={trip} isOrganizer={isOrganizer} isParticipant={isParticipant || false} />
                </div>
            </div>

            {/* Trip Info Cards */}
            <div className="max-w-5xl mx-auto px-6 md:px-10 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                                <Users className="text-teal-600" size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{trip.currentParticipants}/{trip.maxParticipants}</div>
                                <div className="text-sm text-gray-600">Participants</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <Calendar className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-900">
                                    {trip.datesConfirmed ? 'Dates Confirmed' : 'Voting Open'}
                                </div>
                                <div className="text-xs text-gray-600">
                                    {trip.datesConfirmed && trip.startDate
                                        ? `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate!).toLocaleDateString()}`
                                        : 'Vote on dates below'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {trip.estimatedCost && (
                        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                    <DollarSign className="text-amber-600" size={24} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">Est. Cost</div>
                                    <div className="text-xs text-gray-600">{trip.estimatedCost}/person</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            {trip.status !== 'cancelled' && (
                <div className="max-w-5xl mx-auto px-6 md:px-10 mb-8">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
                        {isOrganizer ? (
                            <>
                                <button
                                    onClick={() => navigate(`/campbar/trips/${id}/edit`)}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition"
                                >
                                    <Edit size={18} />
                                    Edit Trip
                                </button>
                                {trip.status === 'confirmed' && (
                                    <button
                                        onClick={() => handleUpdateStatus('ongoing')}
                                        disabled={actionLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                                    >
                                        <Play size={18} />
                                        Start Trip
                                    </button>
                                )}
                                {trip.status === 'ongoing' && (
                                    <button
                                        onClick={() => handleUpdateStatus('completed')}
                                        disabled={actionLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                                    >
                                        <CheckCircle size={18} />
                                        Complete Trip
                                    </button>
                                )}
                                <button
                                    onClick={handleCancelTrip}
                                    disabled={actionLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                                >
                                    <AlertCircle size={18} />
                                    Cancel Trip
                                </button>
                            </>
                        ) : isParticipant ? (
                            <>
                                {trip.status === 'confirmed' && trip.participants?.find(p => p.userId === currentUserId)?.status !== 'confirmed' && (
                                    <button
                                        onClick={handleConfirmAttendance}
                                        disabled={actionLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                                    >
                                        <CheckCircle size={18} />
                                        Confirm Attendance
                                    </button>
                                )}
                                <button
                                    onClick={handleLeaveTrip}
                                    disabled={actionLoading}
                                    className="px-4 py-2 border border-red-600 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition disabled:opacity-50"
                                >
                                    Leave Trip
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleJoinTrip}
                                disabled={actionLoading || isFull}
                                className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isFull ? 'Trip Full' : 'Join This Trip'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content Sections */}
            <div className="max-w-5xl mx-auto px-6 md:px-10 space-y-6">
                {/* Participants */}
                <ParticipantsList
                    participants={trip.participants || []}
                    organizerId={trip.organizerId}
                />

                {/* Date Voting */}
                {!trip.datesConfirmed && (
                    <DateVotingSection
                        tripId={trip.id}
                        dateOptions={trip.dateOptions || []}
                        isOrganizer={isOrganizer}
                        onRefresh={fetchTripDetails}
                    />
                )}

                {/* Gear Coordination */}
                <GearSection
                    tripId={trip.id}
                    gearItems={trip.gearItems || []}
                    isOrganizer={isOrganizer}
                    currentUserId={currentUserId}
                    onRefresh={fetchTripDetails}
                />

                {/* Messaging */}
                <MessagingSection
                    tripId={trip.id}
                    messages={trip.messages || []}
                    onRefresh={fetchTripDetails}
                />
            </div>
        </div>
    );
};

export default TripDetailsPage;
