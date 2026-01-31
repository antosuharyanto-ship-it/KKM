import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import campbarApi from '../../../utils/campbarApi';
import type { Message } from '../../../utils/campbarTypes';

interface Props {
    tripId: string;
    messages: Message[];
    onRefresh: () => void;
}

export const MessagingSection: React.FC<Props> = ({ tripId, messages: initialMessages, onRefresh }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [initialMessages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) return;

        setSending(true);
        try {
            await campbarApi.sendMessage(tripId, message);
            setMessage('');
            onRefresh(); // Refresh to get new messages
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const formatTimestamp = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="text-green-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Trip Discussion</h2>
            </div>

            {/* Messages List */}
            <div className="mb-4 max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg">
                {initialMessages.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">No messages yet. Start the conversation!</p>
                ) : (
                    <>
                        {initialMessages.map((msg) => (
                            <div key={msg.id} className="flex items-start gap-3">
                                {msg.user?.picture ? (
                                    <img
                                        src={msg.user.picture}
                                        alt={msg.user.name || 'User'}
                                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                                        {msg.user?.name?.charAt(0) || '?'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="font-semibold text-gray-900 text-sm">{msg.user?.name || 'Unknown'}</span>
                                        <span className="text-xs text-gray-500">{formatTimestamp(msg.createdAt)}</span>
                                    </div>
                                    <p className="text-gray-800 text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Send Message Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Send size={18} />
                    Send
                </button>
            </form>
        </div>
    );
};

export default MessagingSection;
