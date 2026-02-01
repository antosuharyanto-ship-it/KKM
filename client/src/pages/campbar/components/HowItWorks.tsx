import React from 'react';
import { Crown, Vote, Ticket, Tent } from 'lucide-react';

export const HowItWorks: React.FC = () => {
    const steps = [
        {
            icon: <Crown className="text-yellow-600" size={24} />,
            title: "Be the Organizer",
            description: "Create a trip, propose dates/places, and invite your circle."
        },
        {
            icon: <Vote className="text-blue-600" size={24} />,
            title: "Vote on Dates",
            description: "Participants join and vote for the best schedule option."
        },
        {
            icon: <Ticket className="text-teal-600" size={24} />,
            title: "Get Tickets",
            description: "Dates are finalized, and everyone gets an official pass."
        },
        {
            icon: <Tent className="text-green-600" size={24} />,
            title: "Gear Together",
            description: "Coordinate equipment in real-time. No more duplicate items!"
        }
    ];

    return (
        <div className="mb-10 bg-gradient-to-r from-teal-50 to-white rounded-2xl p-6 border border-teal-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
                <div className="bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded">NEW</div>
                <h2 className="text-lg font-bold text-gray-800">How CampBar Works</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {steps.map((step, index) => (
                    <div key={index} className="flex flex-col items-start gap-3">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                            {step.icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm mb-1">
                                {index + 1}. {step.title}
                            </h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
