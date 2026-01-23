import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MessageSquare, Send, User, Image as ImageIcon } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import { getDisplayImageUrl } from '../utils/imageHelper';

interface Post {
    id: string;
    user_name: string;
    content: string;
    date: string;
}

interface Event {
    id: string;
    activity: string;
    start_time: string;
    location: string;
    event_images: string;
    status: string;
    gallery_images?: string;
}

export const CommunityPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'discussion' | 'gallery'>('discussion');

    // Discussion State
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [newPost, setNewPost] = useState('');
    const [posting, setPosting] = useState(false);

    // Gallery State
    const [events, setEvents] = useState<Event[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(true);
    const navigate = useNavigate();

    // Fetch User & Initial Data
    useEffect(() => {
        // Check Auth
        axios.get(`${API_BASE_URL}/auth/me`, { withCredentials: true })
            .then(res => setUser(res.data))
            .catch(() => setUser(null));

        // Load Discussion Posts
        fetchPosts();

        // Load Gallery Events
        fetchGallery();
    }, []);

    const fetchPosts = () => {
        setLoadingPosts(true);
        axios.get(`${API_BASE_URL}/api/community`)
            .then(res => setPosts(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoadingPosts(false));
    };

    const fetchGallery = () => {
        setLoadingGallery(true);
        axios.get(`${API_BASE_URL}/api/events`)
            .then(res => {
                const pastEvents = res.data.filter((e: Event) =>
                    e.status === 'Closed' ||
                    e.status === 'Completed' ||
                    (e.gallery_images && e.gallery_images.length > 0)
                );
                setEvents(pastEvents);
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingGallery(false));
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

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=1000';
    };

    return (
        <div className="pb-24 pt-4 px-4 bg-stone-50 min-h-screen">
            <div className="max-w-3xl mx-auto">
                {/* Header & Tabs */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Community</h1>
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-stone-200">
                        <button
                            onClick={() => setActiveTab('discussion')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'discussion'
                                ? 'bg-teal-700 text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <MessageSquare size={16} /> Discussions
                        </button>
                        <button
                            onClick={() => setActiveTab('gallery')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'gallery'
                                ? 'bg-teal-700 text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <ImageIcon size={16} /> Memories
                        </button>
                    </div>
                </div>

                {/* DISCUSSION TAB */}
                {activeTab === 'discussion' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Post Form */}
                        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 mb-8">
                            {user ? (
                                <form onSubmit={handlePost}>
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 flex-shrink-0 flex items-center justify-center text-teal-700 font-bold text-lg border-2 border-white shadow-sm">
                                            {user.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <textarea
                                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition resize-none placeholder-gray-400"
                                                rows={3}
                                                placeholder={`What's on your mind, ${user.full_name.split(' ')[0]}?`}
                                                value={newPost}
                                                onChange={e => setNewPost(e.target.value)}
                                            ></textarea>
                                            <div className="flex justify-end mt-2">
                                                <button
                                                    type="submit"
                                                    disabled={posting || !newPost.trim()}
                                                    className="bg-teal-800 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-teal-900 transition flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg disabled:shadow-none"
                                                >
                                                    {posting ? 'Sending...' : <><Send size={14} /> Post</>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="text-center py-6 bg-stone-50 rounded-xl border border-dashed border-stone-300">
                                    <p className="text-gray-500 mb-3 text-sm">Join the conversation with other campers!</p>
                                    <button
                                        onClick={() => window.location.href = `${API_BASE_URL}/auth/google`}
                                        className="bg-white border border-gray-300 text-gray-800 px-6 py-2.5 rounded-full text-sm font-bold hover:bg-gray-50 transition shadow-sm"
                                    >
                                        Sign In with Google
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Feed */}
                        {loadingPosts ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 h-24 animate-pulse"></div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {posts.map((post) => (
                                    <div key={post.id} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 hover:shadow-md transition">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-orange-700 font-bold text-sm border-2 border-white shadow-sm">
                                                <User size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-gray-900 text-sm">{post.user_name}</h3>
                                                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                                        {!isNaN(new Date(post.date).getTime()) ? new Date(post.date).toLocaleDateString() : 'Just now'}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                                                    {post.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {posts.length === 0 && (
                                    <div className="text-center py-20 bg-white rounded-3xl border border-stone-100">
                                        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
                                            <MessageSquare size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Quiet Camp</h3>
                                        <p className="text-gray-400 text-sm max-w-xs mx-auto">Start a conversation and connect with your camping neighbors.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* MEMORIES (GALLERY) TAB */}
                {activeTab === 'gallery' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {loadingGallery ? (
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[4/3] bg-gray-200 rounded-2xl animate-pulse"></div>)}
                            </div>
                        ) : events.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-stone-100">
                                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
                                    <ImageIcon size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">No Memories Yet</h3>
                                <p className="text-gray-400 text-sm">Join our next event to be part of the story!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {events.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => navigate(`/event/${event.id}`)}
                                        className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 cursor-pointer"
                                    >
                                        <div className="h-56 relative overflow-hidden bg-gray-100">
                                            <img
                                                src={getDisplayImageUrl(event.event_images)}
                                                alt={event.activity}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                onError={handleImageError}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                            <div className="absolute bottom-4 left-4 right-4 text-white">
                                                <h3 className="font-bold text-lg leading-tight mb-1 shadow-black drop-shadow-md">{event.activity}</h3>
                                                <p className="text-xs opacity-90 flex items-center gap-2">
                                                    <span className="bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">{event.start_time}</span>
                                                    <span>{event.location}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};
