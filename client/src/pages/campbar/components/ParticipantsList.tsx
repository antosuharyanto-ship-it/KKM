import React from 'react';
import { Users, Crown, Ticket } from 'lucide-react';
import type { Participant } from '../../../utils/campbarTypes';
import { API_BASE_URL } from '../../../config';

interface Props {
    participants: Participant[];
    organizerId: string;
}

export const ParticipantsList: React.FC<Props> = ({ participants, organizerId }) => {
    const getStatusBadge = (status: string) => {
        const colors = {
            interested: 'bg-blue-100 text-blue-700',
            confirmed: 'bg-green-100 text-green-700',
            waitlist: 'bg-yellow-100 text-yellow-700'
        };
        return colors[status as keyof typeof colors] || colors.interested;
    };

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
                <Users className="text-teal-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Participants ({participants.length})</h2>
            </div>

            {participants.length === 0 ? (
                <p className="text-gray-500 text-sm">No participants yet. Be the first to join!</p>
            ) : (
                <div className="space-y-3">
                    {participants.map((participant) => (
                        <div
                            key={participant.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                            <div className="flex items-center gap-3">
                                {participant.user?.picture ? (
                                    <img
                                        src={participant.user.picture}
                                        alt={participant.user.name}
                                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                                        {participant.user?.name.charAt(0) || '?'}
                                    </div>
                                )}
                                <div>
                                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                                        {participant.user?.name || 'Unknown'}
                                        {participant.userId === organizerId && (
                                            <Crown size={14} className="text-yellow-600 inline" />
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {participant.user?.email}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {participant.ticketUrl && (
                                    <a
                                        href={`${API_BASE_URL}/api/campbar/tickets/download/${participant.ticketUrl.split('/').pop()}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg border border-teal-200 transition-colors"
                                        title="View Ticket"
                                    >
                                        <Ticket size={16} />
                                    </a>
                                )}
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(participant.status)}`}>
                                    {participant.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ParticipantsList;
