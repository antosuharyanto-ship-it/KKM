import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Tag, Search, ShoppingCart } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { getDisplayImageUrl } from '../utils/imageHelper';
import { useNavigate } from 'react-router-dom';

interface Product {
    product_name: string;
    unit_price: string;
    category: string;
    product_image?: string;
    supplier_email?: string;
    stok?: string;
    contact_person?: string;
    phone_number?: string;
    discontinued?: string;
    notes?: string;
}

export const MarketplacePage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Order State
    const [selectedItem, setSelectedItem] = useState<Product | null>(null);
    const [orderQty, setOrderQty] = useState(1);
    const [userDetails, setUserDetails] = useState({ name: '', email: '', phone: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch user details for pre-fill
    useEffect(() => {
        axios.get(`${API_BASE_URL}/auth/me`, { withCredentials: true })
            .then(res => {
                if (res.data) {
                    setUserDetails({
                        name: res.data.full_name || '',
                        email: res.data.email || '',
                        phone: ''
                    });
                }
            })
            .catch(() => { }); // Ignore auth error (guest mode)
    }, []);

    const fetchItems = () => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/api/marketplace`)
            .then(res => setItems(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchItems();
    }, []);

    // Filter Logic
    const filteredItems = items.filter(item => {
        const matchesSearch = (item.product_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['All', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))];

    const handleBuyClick = (item: Product, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent duplicate trigger
        setSelectedItem(item);
        setOrderQty(1);
    };

    const handleOrderSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        setIsSubmitting(true);

        // Parse price (e.g. "Rp 50.000" -> 50000)
        const priceString = selectedItem.unit_price.replace(/[^0-9]/g, '');
        const unitPrice = parseInt(priceString) || 0;
        const totalPrice = unitPrice * orderQty;

        try {
            await axios.post(`${API_BASE_URL}/api/marketplace/order`, {
                itemName: selectedItem.product_name,
                unitPrice: selectedItem.unit_price,
                quantity: orderQty,
                totalPrice: `Rp ${totalPrice.toLocaleString('id-ID')}`,
                userName: userDetails.name,
                userEmail: userDetails.email,
                phone: userDetails.phone,
                supplierEmail: selectedItem.supplier_email
            });

            alert('Order placed successfully! Please check "My Orders" to upload payment proof.');
            setSelectedItem(null);
            fetchItems(); // Refresh stock
            navigate('/my-orders');
        } catch (error) {
            console.error(error);
            alert('Failed to place order.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-10 relative">
            {/* Header Section */}
            <div className="bg-teal-800 text-white pt-10 pb-16 px-6 md:px-10 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-700/30 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>

                <div className="max-w-4xl mx-auto relative z-10 text-center md:text-left">
                    <h1 className="text-3xl font-bold mb-2">{t('marketplace.title')}</h1>
                    <p className="text-teal-100 text-sm mb-6">{t('marketplace.subtitle')}</p>

                    {/* Islamic Preamble / Muqaddimah */}
                    <div className="bg-teal-900/40 backdrop-blur-sm p-6 rounded-2xl border border-teal-700/50 mb-8 text-center">
                        <p className="text-lg font-arabic mb-4 leading-relaxed text-orange-100" dir="rtl">
                            Bismillāhirraḥmānirraḥīm.<br />
                            إِنَّ الْحَمْدَ ِللهِ، نَحْمَدُهُ وَنَسْتَعِيْنُهُ وَنَسْتَغْفِرُهُ، وَنَعُوْذُ بِاللهِ مِنْ شُرُوْرِ أَنْفُسِنَا وَمِنْ سَيِّئَاتِ أَعْمَالِنَا، مَنْ يَهْدِهِ اللهُ فَلاَ مُضِلَّ لَهُ، وَمَنْ يُضْلِلْ فَلاَ هَـادِيَ لَهُ، وَأَشْـهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيْكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ.
                        </p>
                        <div className="text-xs text-teal-200 space-y-3 font-light italic">
                            <p>
                                "Segala puji hanya bagi Allah, kami memuji-Nya, memohon pertolongan dan ampunan kepada-Nya, kami berlindung kepada Allah dari kejahatan diri-diri kami dan kejelekan amal perbuatan kami. Barangsiapa yang Allah beri petunjuk, maka tidak ada yang dapat menyesatkannya, dan barangsiapa yang Allah sesatkan, maka tidak ada yang dapat memberinya petunjuk.
                            </p>
                            <p>
                                Aku bersaksi bahwasanya tidak ada ilah yang berhak diibadahi dengan benar kecuali Allah saja, tidak ada sekutu bagi-Nya, dan aku bersaksi bahwasanya Nabi Muhammad Shallallahu ‘alaihi wa sallam adalah hamba dan Rasul-Nya."
                            </p>
                            <div className="w-16 h-0.5 bg-orange-400/50 mx-auto my-3"></div>
                            <p className="text-white font-medium not-italic">
                                "Pada kesempatan ini, akad jual beli dilaksanakan berdasarkan prinsip syariah Islam, dengan kerelaan kedua belah pihak, secara jujur, adil, dan tanpa unsur riba, gharar, maupun maisir. Semoga akad ini sah, halal, dan membawa keberkahan bagi semua pihak. Aamiin"
                            </p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('marketplace.search_placeholder')}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-teal-200 focus:outline-none focus:bg-white/20 transition shadow-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-200" size={20} />
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <div className="px-6 md:px-10 -mt-8 mb-8 max-w-4xl mx-auto overflow-x-auto no-scrollbar flex gap-3 pb-2 relative z-20">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold shadow-sm transition-all ${selectedCategory === cat
                            ? 'bg-orange-500 text-white scale-105'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="px-6 md:px-10 max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-20 text-gray-400">
                        <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
                        Loading Items...
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                        <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                        No items found for "{searchTerm}"
                    </div>
                ) : filteredItems.map((item, idx) => (
                    <div
                        key={idx}
                        onClick={() => handleBuyClick(item)}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-100 transition group flex flex-col cursor-pointer active:scale-95 duration-200">
                        <div className="h-32 bg-gray-50 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                            {item.product_image ? (
                                <img
                                    src={getDisplayImageUrl(item.product_image)}
                                    alt={item.product_name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            ) : (
                                <Tag className="text-gray-300 group-hover:text-teal-400 transition duration-500" size={40} />
                            )}
                        </div>
                        <div className="flex-1">
                            <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider bg-teal-50 px-2 py-1 rounded-md mb-2 inline-block">
                                {item.category || 'General'}
                            </span>
                            <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight mb-1 line-clamp-2">{item.product_name || 'Unnamed Item'}</h3>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-orange-600 font-bold">{item.unit_price || 'Free'}</p>
                            <button
                                onClick={(e) => handleBuyClick(item, e)}
                                className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-teal-800 hover:text-white transition">
                                <ShoppingCart size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Order Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

                        <h2 className="text-xl font-bold text-teal-900 mb-1">Confirm Order</h2>
                        <p className="text-sm text-gray-500 mb-6">Complete your purchase details below.</p>

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                            <div className="w-16 h-16 bg-white rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200">
                                {selectedItem.product_image ? (
                                    <img src={getDisplayImageUrl(selectedItem.product_image)} className="w-full h-full object-cover" />
                                ) : (
                                    <Tag className="text-gray-300" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{selectedItem.product_name}</h3>
                                <p className="text-orange-600 font-bold">{selectedItem.unit_price}</p>
                            </div>
                        </div>

                        <form onSubmit={handleOrderSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantity</label>
                                <div className="flex items-center gap-4">
                                    <button type="button" onClick={() => setOrderQty(Math.max(1, orderQty - 1))} className="w-10 h-10 rounded-full bg-gray-100 text-lg font-bold hover:bg-gray-200">-</button>
                                    <span className="text-xl font-bold w-12 text-center">{orderQty}</span>
                                    <button type="button" onClick={() => setOrderQty(orderQty + 1)} className="w-10 h-10 rounded-full bg-gray-100 text-lg font-bold hover:bg-gray-200">+</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Your Name</label>
                                    <input
                                        readOnly
                                        disabled
                                        className="w-full p-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed"
                                        value={userDetails.name || 'Login required'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone / WA</label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-teal-600"
                                        value={userDetails.phone}
                                        onChange={e => setUserDetails({ ...userDetails, phone: e.target.value })}
                                        placeholder="08..."
                                    />
                                </div>
                            </div>

                            {/* Total Price Estimation */}
                            <div className="bg-teal-50 p-4 rounded-xl flex justify-between items-center">
                                <span className="text-teal-800 font-medium">Estimated Total</span>
                                <span className="text-xl font-bold text-teal-900">
                                    {(() => {
                                        const cleanPrice = parseInt(selectedItem.unit_price.replace(/[^0-9]/g, '')) || 0;
                                        return `Rp ${(cleanPrice * orderQty).toLocaleString('id-ID')}`;
                                    })()}
                                </span>
                            </div>

                            {userDetails.email ? (
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmitting ? 'Processing...' : 'Place Order'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => window.location.href = '/login'}
                                    className="w-full py-4 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-lg transition">
                                    Login to Order
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
