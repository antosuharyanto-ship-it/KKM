import React from 'react';
import { Play, CheckCircle, Calendar, Users } from 'lucide-react';
import type { Trip } from '../../../utils/campbarTypes';

interface Props {
    trip: Trip;
    isOrganizer: boolean;
    isParticipant: boolean;
}

export const ActionGuidance: React.FC<Props> = ({ trip, isOrganizer, isParticipant }) => {
    if (trip.status === 'cancelled') return null;

    // Helper to render the card
    const renderCard = (icon: React.ReactNode, title: string, message: string, colorClass: string) => (
        <div className={`rounded-xl p-4 border ${colorClass} mb-6 flex gap-4 items-start shadow-sm`}>
            <div className="shrink-0 mt-1">{icon}</div>
            <div>
                <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
            </div>
        </div>
    );

    // --- ORGANIZER GUIDANCE ---
    if (isOrganizer) {
        if (trip.status === 'planning') {
            return renderCard(
                <Calendar className="text-teal-600" size={24} />,
                "Organizer Action: Finalize Schedule",
                "Participants are voting on dates. When you're ready, scroll down to the date options and click the checkmark (✅) on the winning date to confirm it.",
                "bg-teal-50 border-teal-200"
            );
        }
        if (trip.status === 'confirmed') {
            return renderCard(
                <Play className="text-purple-600" size={24} />,
                "Organizer Action: Start Trip",
                "Everything is set! Tickets have been generated for all accepted participants. On the day of departure, click 'Start Trip' above to update the status.",
                "bg-purple-50 border-purple-200"
            );
        }
        if (trip.status === 'ongoing') {
            return renderCard(
                <CheckCircle className="text-green-600" size={24} />,
                "Organizer Action: Manage Trip",
                "The trip is in progress. Have fun! When the trip concludes, remember to come back here and click 'Complete Trip'.",
                "bg-green-50 border-green-200"
            );
        }
    }

    // --- PARTICIPANT GUIDANCE ---
    if (isParticipant) {
        if (trip.status === 'planning') {
            const myVotes = trip.dateOptions?.some(opt => opt.userVoted);
            if (!myVotes) {
                return renderCard(
                    <Calendar className="text-blue-600" size={24} />,
                    "Action Required: Vote on Dates",
                    "Please cast your vote for the date options below so the organizer can finalize the schedule.",
                    "bg-blue-50 border-blue-200"
                );
            } else {
                return renderCard(
                    <CheckCircle className="text-green-600" size={24} />,
                    "You Voted!",
                    "Thanks for voting. Waiting for the organizer to confirm the final date.",
                    "bg-green-50 border-green-200"
                );
            }
        }
        if (trip.status === 'confirmed') {
            // Check if I have a ticket
            // In real app, we might check trip.participants list for 'ticketUrl'
            // For now generic message
            return renderCard(
                <Users className="text-teal-600" size={24} />,
                "You're Going!",
                "The trip is confirmed. Your ticket has been generated. Check the 'Participants' list below or your email for details.",
                "bg-teal-50 border-teal-200"
            );
        }
    }

    // Default: No special action needed or simply browsing
    return null;
};

export default ActionGuidance;
