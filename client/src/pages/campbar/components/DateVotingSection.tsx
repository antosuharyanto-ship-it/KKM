import React, { useState } from 'react';
import { Calendar, Plus, ThumbsUp, Trash2, Check } from 'lucide-react';
import campbarApi from '../../../utils/campbarApi';
import type { DateVote } from '../../../utils/campbarTypes';

interface Props {
    tripId: string;
    dateOptions: DateVote[];
    isOrganizer: boolean;
    onRefresh: () => void;
}

export const DateVotingSection: React.FC<Props> = ({ tripId, dateOptions, isOrganizer, onRefresh }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAddDate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!startDate || !endDate) {
            alert('Please fill in both dates');
            return;
        }

        setLoading(true);
        try {
            await campbarApi.addDateOption(tripId, { startDate, endDate });
            setStartDate('');
            setEndDate('');
            setShowAddForm(false);
            onRefresh();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to add date option');
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (dateId: string, userVoted: boolean) => {
        setLoading(true);
        try {
            if (userVoted) {
                await campbarApi.unvoteDate(tripId, dateId);
            } else {
                await campbarApi.voteDate(tripId, dateId);
            }
            onRefresh();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to vote');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDate = async (dateId: string) => {
        const confirmed = window.confirm('Confirm this date for the trip? This will set the trip dates and close voting.');
        if (!confirmed) return;

        setLoading(true);
        try {
            await campbarApi.confirmDate(tripId, dateId);
            alert('Date confirmed!');
            onRefresh();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to confirm date');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDate = async (dateId: string) => {
        const confirmed = window.confirm('Delete this date option?  ');
        if (!confirmed) return;

        setLoading(true);
        try {
            await campbarApi.deleteDateOption(tripId, dateId);
            onRefresh();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to delete date');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Calendar className="text-blue-600" size={24} />
                    <h2 className="text-xl font-bold text-gray-900">Date Voting</h2>
                </div>
                {isOrganizer && !showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                    >
                        <Plus size={16} />
                        Add Date Option
                    </button>
                )}
            </div>

            {/* Add Date Form */}
            {showAddForm && (
                <form onSubmit={handleAddDate} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Add Date Option</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                required
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                required
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddForm(false);
                                setStartDate('');
                                setEndDate('');
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            Add Option
                        </button>
                    </div>
                </form>
            )}

            {/* Date Options */}
            {dateOptions.length === 0 ? (
                <p className="text-gray-500 text-sm">No date options yet. Organizer can add dates for voting.</p>
            ) : (
                <div className="space-y-3">
                    {dateOptions.map((option) => (
                        <div
                            key={option.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                            <div className="flex-1">
                                <div className="font-semibold text-gray-900">
                                    {(() => {
                                        const start = new Date(option.startDate);
                                        const end = new Date(option.endDate);

                                        // If invalid date, show raw value for debugging
                                        if (isNaN(start.getTime())) return `Invalid: ${option.startDate}`;

                                        return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                                    })()}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                    {option.voteCount} {option.voteCount === 1 ? 'vote' : 'votes'}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Vote Button */}
                                <button
                                    onClick={() => handleVote(option.id, option.userVoted || false)}
                                    disabled={loading}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 ${option.userVoted
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-50'
                                        }`}
                                >
                                    <ThumbsUp size={16} className={option.userVoted ? 'fill-white' : ''} />
                                    {option.userVoted ? 'Voted' : 'Vote'}
                                </button>

                                {/* Organizer Actions */}
                                {isOrganizer && (
                                    <>
                                        <button
                                            onClick={() => handleConfirmDate(option.id)}
                                            disabled={loading}
                                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                            title="Confirm this date"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDate(option.id)}
                                            disabled={loading}
                                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                                            title="Delete option"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DateVotingSection;
