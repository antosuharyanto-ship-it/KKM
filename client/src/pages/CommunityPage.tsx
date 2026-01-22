import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MessageSquare, Send, User } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Post {
    id: string;
    user_name: string;
    content: string;
    date: string;
}

export const CommunityPage: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [newPost, setNewPost] = useState('');
    const [posting, setPosting] = useState(false);

    // Fetch User & Posts
    useEffect(() => {
        // Check Auth
        axios.get(`${API_BASE_URL}/auth/me`, { withCredentials: true })
            .then(res => setUser(res.data))
            .catch(() => setUser(null));

        // Fetch Posts
        fetchPosts();
    }, []);

    const fetchPosts = () => {
        axios.get(`${API_BASE_URL}/api/community`)
            .then(res => setPosts(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPost.trim() || !user) return;

        setPosting(true);
        try {
            await axios.post(`${API_BASE_URL}/api/community`, { content: newPost }, { withCredentials: true });
            setNewPost('');
            fetchPosts(); // Refresh
        } catch (error) {
            alert('Failed to post message');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="pb-20 pt-4 px-4 bg-gray-50 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="text-teal-600" /> Community Wall
                    </h1>
                    <p className="text-gray-500 text-sm">Connect with other attendees</p>
                </div>

                {/* Post Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-8">
                    {user ? (
                        <form onSubmit={handlePost}>
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-teal-100 flex-shrink-0 flex items-center justify-center text-teal-700 font-bold text-lg">
                                    {user.full_name?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition resize-none"
                                        rows={3}
                                        placeholder="Share your thoughts..."
                                        value={newPost}
                                        onChange={e => setNewPost(e.target.value)}
                                    ></textarea>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-gray-400">Posting as {user.full_name}</span>
                                        <button
                                            type="submit"
                                            disabled={posting || !newPost.trim()}
                                            className="bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-900 transition flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {posting ? 'Sending...' : <><Send size={14} /> Post</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-gray-500 mb-3 text-sm">Sign in to join the conversation</p>
                            <button
                                onClick={() => window.location.href = `${API_BASE_URL}/auth/google`}
                                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition"
                            >
                                Sign In with Google
                            </button>
                        </div>
                    )}
                </div>

                {/* Feed */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 h-24 animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <div key={post.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-orange-700 font-bold text-xs">
                                        <User size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-gray-900 text-sm">{post.user_name}</h3>
                                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                {new Date(post.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap leading-relaxed">
                                            {post.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {posts.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-gray-400 text-sm">No posts yet. Be the first to say hello!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
