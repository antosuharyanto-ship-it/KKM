import React from 'react';
import { Check } from 'lucide-react';

interface Props {
    status: 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
}

export const TripProgressBar: React.FC<Props> = ({ status }) => {
    const steps = [
        { key: 'planning', label: 'Voting' },
        { key: 'confirmed', label: 'Confirmed' },
        { key: 'ongoing', label: 'Ongoing' },
        { key: 'completed', label: 'Done' }
    ];

    // Determine current step index
    const statusMap: Record<string, number> = {
        'planning': 0,
        'confirmed': 1,
        'ongoing': 2,
        'completed': 3,
        'cancelled': -1
    };

    const currentIndex = statusMap[status] ?? 0;

    if (status === 'cancelled') {
        return (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center font-bold mb-6 border border-red-200">
                This trip has been cancelled.
            </div>
        );
    }

    return (
        <div className="w-full mb-8">
            <div className="relative flex items-center justify-between">
                {/* Connecting Line - Background */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10" />

                {/* Connecting Line - Progress */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-teal-600 -z-10 transition-all duration-500 ease-in-out"
                    style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                        <div key={step.key} className="flex flex-col items-center bg-white px-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted
                                        ? 'bg-teal-600 border-teal-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-300'
                                    }`}
                            >
                                {isCompleted ? <Check size={16} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                            </div>
                            <span
                                className={`text-xs font-semibold mt-2 transition-colors duration-300 ${isCurrent ? 'text-teal-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TripProgressBar;
