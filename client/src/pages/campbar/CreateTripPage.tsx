import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import campbarApi from '../../utils/campbarApi';
import type { CreateTripFormData } from '../../utils/campbarTypes';

export const CreateTripPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreateTripFormData>({
        title: '',
        destination: '',
        description: '',
        difficulty: 'moderate',
        maxParticipants: 10,
        startDate: '',
        endDate: '',
        estimatedCost: '',
    });

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
            if (!response.ok) {
                alert('Please login to create a trip');
                navigate('/');
            }
        } catch (error) {
            console.error('Auth check failed', error);
            navigate('/');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim() || !formData.destination.trim()) {
            alert('Please fill in required fields (Title and Destination)');
            return;
        }

        setLoading(true);
        try {
            const trip = await campbarApi.createTrip(formData);
            alert('Trip created successfully!');
            navigate(`/campbar/trips/${trip.id}`);
        } catch (error: any) {
            console.error('[CreateTrip] Error:', error);
            const message = error.response?.data?.error || error.message || 'Failed to create trip';
            alert(`Error: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: keyof CreateTripFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-teal-700 to-emerald-800 text-white pt-8 pb-12 px-6 md:px-10">
                <div className="max-w-3xl mx-auto">
                    <button
                        onClick={() => navigate('/campbar')}
                        className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition"
                    >
                        <ArrowLeft size={20} />
                        Back to Trips
                    </button>
                    <h1 className="text-3xl font-bold">Create New Trip</h1>
                    <p className="text-teal-100 mt-2">Plan your next camping adventure</p>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-3xl mx-auto px-6 md:px-10 -mt-6">
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                    {/* Title */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Trip Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => updateField('title', e.target.value)}
                            placeholder="e.g., Weekend Camping at Mount Gede"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    {/* Destination */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Destination <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.destination}
                            onChange={(e) => updateField('destination', e.target.value)}
                            placeholder="e.g., Mount Gede, West Java"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            placeholder="Tell participants about this trip, what to expect, and any special details..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    {/* Difficulty & Max Participants */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Difficulty Level
                            </label>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => updateField('difficulty', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="easy">Easy - Beginners welcome</option>
                                <option value="moderate">Moderate - Some experience needed</option>
                                <option value="hard">Hard - Experienced only</option>
                                <option value="expert">Expert - Very challenging</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Max Participants
                            </label>
                            <input
                                type="number"
                                min="2"
                                max="100"
                                value={formData.maxParticipants}
                                onChange={(e) => updateField('maxParticipants', parseInt(e.target.value) || 10)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    {/* Dates (Optional) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Start Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => updateField('startDate', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to use date voting</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                End Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => updateField('endDate', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    {/* Estimated Cost */}
                    <div className="mb-8">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Estimated Cost per Person
                        </label>
                        <input
                            type="text"
                            value={formData.estimatedCost}
                            onChange={(e) => updateField('estimatedCost', e.target.value)}
                            placeholder="e.g., Rp 500,000"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Optional: Help people budget for the trip</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/campbar')}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>Creating...</>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Create Trip
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTripPage;
