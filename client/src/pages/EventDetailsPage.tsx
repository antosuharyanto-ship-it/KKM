import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Calendar, CheckCircle, ArrowLeft, Tent } from 'lucide-react';
// Ticket removed from import as it was unused and conflicting with interface names if any.
// If Ticket was meant to be the Lucide icon, it is aliased as TicketIcon.
// Checking usages...

interface Event {
    id: string;
    activity: string;
    start_time: string;
    end_time: string;
    location: string;
    event_images: string;
    description: string;
    event_capacity: string;
    current_capacity: string;
    status: string;
    price_new_member?: string;
    price_alumni?: string;
    gallery_images?: string;
    sponsor?: string; // Column M
}

import { getDisplayImageUrl } from '../utils/imageHelper';
import { API_BASE_URL } from '../config';

export const EventDetailsPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
    const [ticketCode, setTicketCode] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [sponsorImages, setSponsorImages] = useState<string[]>([]); // New State

    // Helper to extract Drive ID
    const extractDriveId = (url: string) => {
        const match = url.match(/[-\w]{25,}/);
        return match ? match[0] : url;
    };

    // Helper to fetch images from a "Drive Link or Comma List" field
    const fetchImagesFromSource = async (source: string): Promise<string[]> => {
        if (!source) return [];
        const isDriveUrl = source.includes('drive.google.com');
        const isSingleId = !source.includes(',') && source.length > 20;

        if (isDriveUrl || isSingleId) {
            try {
                const folderId = extractDriveId(source);
                const folderRes = await axios.get(`${API_BASE_URL}/api/drive/files?folderId=${folderId}`);
                console.log(`[Drive] Fetched ${folderRes.data.length} images for folder ${folderId}`);
                return folderRes.data.map((f: any) => {
                    // Prefer larger thumbnail, else webContent
                    return f.thumbnailLink ? f.thumbnailLink.replace('=s220', '=s1200') : f.webContentLink;
                });
            } catch (err) {
                console.error('Failed to load drive images for source', source, err);
                return isDriveUrl ? [] : [source];
            }
        } else {
            return source.split(',').map(s => s.trim());
        }
    };

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/events`);
                const found = res.data.find((e: any) => String(e.id).trim() === String(id).trim());
                if (found) {
                    setEvent(found);

                    console.log('[DEBUG] Event Found:', found.title || found.activity || found.event_name);
                    console.log('[DEBUG] Gallery Source (Raw):', found.gallery_images);

                    // 1. Fetch Gallery
                    if (found.gallery_images) {
                        console.log('[DEBUG] Fetching Gallery from source...');
                        fetchImagesFromSource(found.gallery_images).then(imgs => {
                            console.log('[DEBUG] Gallery Images Fetched:', imgs.length);
                            setGalleryImages(imgs);
                        });
                    } else {
                        console.log('[DEBUG] No gallery_images found in event object');
                    }

                    // 2. Fetch Sponsors (Identical logic)
                    if (found.sponsor) {
                        fetchImagesFromSource(found.sponsor).then(setSponsorImages);
                    }

                } else {
                    console.warn('Event not found');
                }
            } catch (err) {
                console.error('Failed to load event details');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    // Form State
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Fetch User
        axios.get(`${API_BASE_URL}/auth/me`, { withCredentials: true })
            .then(res => {
                setUser(res.data);
                if (res.data) {
                    setFormData(prev => ({
                        ...prev,
                        userName: res.data.full_name || '',
                        userEmail: res.data.email || ''
                    }));
                }
            })
            .catch(() => setUser(null));
    }, []);

    const [formData, setFormData] = useState({
        userName: '',
        userEmail: '',
        phone: '',
        numberOfPeople: 1,
        memberType: 'New Member',
        seatAllocation: 'Allocated at Check-in',
        tentType: 'Own Tent'
    });
    const [showPaxWarning, setShowPaxWarning] = useState(false);

    // Calculate Price Helper
    const getPrice = () => {
        if (!event) return 0;
        const priceString = formData.memberType === 'New Member'
            ? event.price_new_member
            : event.price_alumni;

        // Remove non-numeric chars just in case "Rp 100.000" is stored
        const cleaned = (priceString || '0').toString().replace(/[^0-9]/g, '');
        return parseInt(cleaned) || 0;
    };

    const finalPrice = getPrice();
    const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(finalPrice);

    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/events`)
            .then(res => {
                const found = res.data.find((e: any) => String(e.id).trim() === String(id).trim());
                setEvent(found || null);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    const handlePaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setFormData({ ...formData, numberOfPeople: val });
        if (val > 4) {
            setShowPaxWarning(true);
        }
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!event) return;

        setBookingStatus('submitting');
        try {
            const payload = {
                eventId: event.id,
                eventName: event.activity,
                date: event.start_time,
                location: event.location,
                userName: formData.userName,
                userEmail: formData.userEmail,
                phone: formData.phone,
                numberOfPeople: formData.numberOfPeople,
                memberType: formData.memberType,
                seatAllocation: formData.seatAllocation,
                tentType: formData.tentType,
                price: formattedPrice
            };

            const res = await axios.post(`${API_BASE_URL}/api/book`, payload);

            if (res.data.success) {
                setTicketCode(res.data.ticketCode);
                // setTicketLink(res.data.ticketLink);
            }
        } catch (error: any) {
            console.error('Booking failed', error);
            const msg = error.response?.data?.message || 'Failed to book ticket. Please try again.';
            alert(msg);
            setBookingStatus('idle');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-teal-800">
            <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
            <p className="font-medium animate-pulse">Loading event details...</p>
        </div>
    );

    if (!event) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-400">
                <Tent size={40} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Available</h1>
            <p className="text-gray-500 max-w-xs mb-8">
                The event you are looking for does not exist or has been removed.
            </p>
            <button
                onClick={() => navigate('/')}
                className="bg-teal-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition shadow-lg shadow-teal-900/10 flex items-center gap-2"
            >
                <ArrowLeft size={18} /> Back to Events
            </button>
        </div>
    );

    // --- Success View ---
    if (bookingStatus === 'success') {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in">
                <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Reserved!</h2>
                    {ticketCode && <p className="text-teal-600 font-mono font-bold mb-2">Code: {ticketCode}</p>}
                    <p className="text-gray-500 mb-6">Please complete your payment.</p>

                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-6 text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full translate-x-10 -translate-y-10 opacity-50"></div>
                        <h3 className="font-bold text-orange-800 text-sm mb-3 relative z-10">Payment Instructions</h3>

                        <div className="mb-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-orange-100 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total Amount</p>
                            <p className="text-3xl font-bold text-green-700 my-1">{formattedPrice}</p>
                            <span className="inline-block bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-1 rounded-full">
                                {formData.memberType}
                            </span>
                        </div>

                        <div className="space-y-3 relative z-10">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Transfer to</p>
                                <p className="font-bold text-gray-900 text-lg">Mandiri: 125-001-075-7557</p>
                                <p className="text-xs text-gray-600">a.n Anggi Vitlana Rinaldy</p>
                            </div>
                            <div className="pt-2 border-t border-orange-200/50">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Confirm Payment</p>
                                <p className="font-bold text-gray-900">Ummu Zahra: +62-813-8236-4484</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <a
                            href={`https://wa.me/6281382364484?text=Assalamualaikum%2C%20saya%20sudah%20booking%20event%20${encodeURIComponent(event.activity)}%20atas%20nama%20${encodeURIComponent(formData.userName)}.%20Mohon%20info%20pembayaran.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20"
                        >
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            Confirm Payment via WhatsApp
                        </a>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full text-gray-500 py-3 font-medium hover:text-gray-900 hover:bg-gray-50 rounded-xl transition"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Booking View ---
    return (
        <div className="pb-40 md:pb-10 bg-white min-h-screen relative md:bg-transparent">
            {/* Pax Warning Modal */}
            {showPaxWarning && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setShowPaxWarning(false)}
                >
                    <div
                        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Tent Capacity Rule</h3>
                        <p className="text-gray-600 mb-6 font-medium leading-relaxed">
                            Ideally, one tent accommodates up to <span className="font-bold text-orange-600">4 people</span>.
                        </p>
                        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 p-4 rounded-xl mb-6">
                            <strong>Note:</strong> You can still proceed, but additional members (more than 4) might be charged as "Additional Pax".
                        </div>
                        <button
                            onClick={() => setShowPaxWarning(false)}
                            className="w-full bg-teal-800 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition"
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            )}

            <div className="md:grid md:grid-cols-2 md:gap-8 lg:gap-12 md:px-4 md:items-start">
                {/* Left Column: Hero Image & Event Info (Desktop Sticky) */}
                <div className="md:sticky md:top-24">
                    {/* Hero Image */}
                    <div className="relative h-72 md:h-[500px] w-full md:rounded-3xl overflow-hidden shadow-2xl group">
                        <img
                            src={getDisplayImageUrl(event.event_images)}
                            alt={event.activity}
                            className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                            onError={(e) => e.currentTarget.src = 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=1000'}
                        />
                        <button
                            onClick={() => navigate(-1)}
                            className="absolute top-4 left-4 bg-white/30 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/50 transition md:hidden"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end">
                            <div className="p-6 md:p-10 text-white w-full">
                                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block shadow-lg">
                                    {event.status || 'Open Registration'}
                                </span>
                                <h1 className="text-3xl md:text-4xl font-bold mb-2 leading-tight">{event.activity}</h1>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white/90 text-sm md:text-base flex items-center gap-2 font-medium hover:text-orange-300 transition w-fit"
                                >
                                    <MapPin size={16} className="text-orange-400" /> {event.location}
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info Grid (Desktop only - simplified) */}
                    <div className="hidden md:grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                            <div className="bg-teal-50 p-3 rounded-full text-teal-700">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Date</p>
                                <p className="font-semibold text-gray-900">{event.start_time}</p>
                            </div>
                        </div>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 hover:border-teal-200 transition cursor-pointer group"
                        >
                            <div className="bg-orange-50 p-3 rounded-full text-orange-600 group-hover:bg-orange-100 transition">
                                <MapPin size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 font-bold uppercase">Location</p>
                                <p className="font-semibold text-gray-900 truncate">Get Directions</p>
                            </div>
                        </a>
                    </div>

                    {/* GALLERY SECTION */}
                    {galleryImages.length > 0 && (
                        <div className="mt-8 mb-8 md:col-span-2">
                            <h3 className="font-bold text-gray-900 text-xl mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-teal-500 rounded-full"></span>
                                Event Gallery
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                                {galleryImages.map((imgUrl, idx) => (
                                    <div
                                        key={idx}
                                        className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition"
                                        onClick={() => setSelectedImage(imgUrl)}
                                    >
                                        <img
                                            src={getDisplayImageUrl(imgUrl)}
                                            alt={`Gallery ${idx + 1}`}
                                            className="w-full h-full object-cover transition duration-500 group-hover:scale-110 bg-gray-200"
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                                // Don't hide completely, maybe show fallback
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <div className="bg-white/90 p-2 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Image Lightbox */}
                    {selectedImage && (
                        <div
                            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                            onClick={() => setSelectedImage(null)}
                        >
                            <button
                                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 p-2 rounded-full transition"
                                onClick={() => setSelectedImage(null)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                            <img
                                src={getDisplayImageUrl(selectedImage)}
                                alt="Full view"
                                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                </div>

                {/* Right Column: Details & Booking Form */}
                <div className="px-6 py-6 space-y-8 md:px-0 md:py-0">

                    {/* Event Description */}
                    <div className="md:bg-white md:p-8 md:rounded-3xl md:shadow-md md:border md:border-gray-100">
                        <h3 className="font-bold text-gray-900 text-xl mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                            About Event
                        </h3>
                        <div className="prose prose-sm prose-gray max-w-none text-gray-600 leading-relaxed">
                            {event.description}
                        </div>
                    </div>

                    {/* EVENT SPONSORS */}
                    {sponsorImages.length > 0 && (
                        <div className="md:bg-white md:p-8 md:rounded-3xl md:shadow-md md:border md:border-gray-100">
                            <h3 className="font-bold text-gray-900 text-xl mb-6 flex items-center gap-2">
                                <span className="w-1 h-6 bg-teal-500 rounded-full"></span>
                                Supported By
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-center">
                                {sponsorImages.map((imgUrl, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-center h-24 group hover:shadow-md transition">
                                        <img
                                            src={getDisplayImageUrl(imgUrl)}
                                            alt={`Sponsor ${idx + 1}`}
                                            className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition duration-300"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Booking Form */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-gray-200/50 sticky top-24">
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            <h3 className="font-bold text-xl text-gray-900 mb-1">Book Your Spot</h3>
                            <p className="text-sm text-gray-500">Secure your ticket for this adventure.</p>
                        </div>

                        {(event.status === 'Closed' || event.status === 'Finished' || event.status === 'Full Booked' || event.status === 'Coming Soon') ? (
                            <div className={`border rounded-2xl p-6 text-center ${event.status === 'Coming Soon' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                                event.status === 'Full Booked' ? 'bg-red-50 border-red-100 text-red-700' :
                                    'bg-gray-50 border-gray-200 text-gray-600'
                                }`}>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${event.status === 'Coming Soon' ? 'bg-amber-100 text-amber-600' :
                                    event.status === 'Full Booked' ? 'bg-red-100 text-red-600' :
                                        'bg-gray-200 text-gray-500'
                                    }`}>
                                    {event.status === 'Coming Soon' ? <Calendar size={32} /> : <CheckCircle size={32} className="rotate-45" />}
                                </div>
                                <h4 className="font-bold text-lg mb-2">
                                    {event.status === 'Coming Soon' ? 'Coming Soon' :
                                        event.status === 'Full Booked' ? 'Registration Full' :
                                            'Event Closed'}
                                </h4>
                                <p className="text-sm opacity-80">
                                    {event.status === 'Coming Soon' ? 'Registration will open soon. Stay tuned!' :
                                        event.status === 'Full Booked' ? 'Sorry, all spots for this event have been filled.' :
                                            'Registration for this event is no longer available.'}
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleBook} className="space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full bg-gray-200 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                                        value={formData.userName}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Email</label>
                                        <input
                                            type="email"
                                            readOnly
                                            className="w-full bg-gray-200 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                                            value={formData.userEmail}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Phone</label>
                                        <input
                                            type="tel"
                                            required
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                                            placeholder="0812..."
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Pax</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                                            value={formData.numberOfPeople}
                                            onChange={handlePaxChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Member Type</label>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition appearance-none"
                                                value={formData.memberType}
                                                onChange={e => setFormData({ ...formData, memberType: e.target.value })}
                                            >
                                                <option value="New Member">New Member</option>
                                                <option value="Alumni">Alumni</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                    <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Tent Type</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                                        placeholder="e.g. Nature Hike V17, Own Tent"
                                        value={formData.tentType}
                                        onChange={e => setFormData({ ...formData, tentType: e.target.value })}
                                    />
                                </div>

                                {/* Price Summary */}
                                <div className="bg-teal-50 rounded-xl p-4 flex justify-between items-center border border-teal-100">
                                    <span className="text-sm text-teal-800 font-medium">Estimated Total</span>
                                    <span className="text-xl font-bold text-teal-900">{formattedPrice}</span>
                                </div>

                                {
                                    !user ? (
                                        <button
                                            type="button"
                                            onClick={() => window.location.href = `${API_BASE_URL}/auth/google`}
                                            className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                                        >
                                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
                                            Sign In to Book
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={bookingStatus === 'submitting'}
                                            className="w-full bg-teal-800 hover:bg-teal-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-900/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {bookingStatus === 'submitting' ? (
                                                <>
                                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    Booking...
                                                </>
                                            ) : 'Book Now'}
                                        </button>
                                    )
                                }
                                <p className="text-center text-xs text-red-500 mt-3 font-medium bg-red-50 p-2 rounded-lg">
                                    * Registration is Non-Refundable
                                </p>
                            </form >
                        )}
                    </div >
                </div >
            </div >
        </div >
    );
};
