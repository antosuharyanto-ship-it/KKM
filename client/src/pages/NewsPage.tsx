import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Megaphone, Calendar, User } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface NewsItem {
    id: string;
    title: string;
    content: string;
    author: string;
    date: string;
    type: string;
}

export const NewsPage: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/news`)
            .then(res => setNews(res.data))
            .catch(err => console.error('Failed to load news', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-800"></div>
        </div>
    );

    return (
        <div className="pb-20 pt-4 px-4 bg-gray-50 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
                        <Megaphone className="text-orange-500" /> Announcements
                    </h1>
                    <p className="text-gray-500">Latest updates from the organizers</p>
                </div>

                {news.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-400">No announcements yet.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {news.map((item) => (
                            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-teal-600">
                                        <span className={`px-2 py-1 rounded-full ${item.type === 'Alert' ? 'bg-red-100 text-red-700' : 'bg-teal-50 text-teal-700'
                                            }`}>
                                            {item.type}
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <Calendar size={12} /> {new Date(item.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h2>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{item.content}</p>

                                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                                        <div className="bg-gray-100 p-1.5 rounded-full">
                                            <User size={12} />
                                        </div>
                                        Posted by <span className="font-medium text-gray-600">{item.author}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
