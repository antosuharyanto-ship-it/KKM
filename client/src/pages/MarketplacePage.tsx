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
    // Delivery Integration
    weight_gram?: string; // from Sheet "Weight (gram)" -> weight_gram
    stock_status?: string; // Ready Stock / Pre-Order
    description?: string;
    origin_city_id?: string;
    origin_city?: string;
}

// --- Delivery Integration Interfaces ---
interface UserAddress {
    id: string;
    label: string;
    recipient_name: string;
    phone: string;
    address_city_name: string;
    address_province_name: string;
    is_default: boolean;
    address_city_id: string;
}

interface ShippingCostResult {
    service: string;
    description: string;
    cost: [{ value: number, etd: string, note: string }];
    debug_metadata?: {
        resolvedOriginId?: string;
        resolvedDestId?: string;
    };
}

declare global {
    interface Window {
        snap: any;
    }
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

    // Delivery State
    const [addresses, setAddresses] = useState<UserAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    const [selectedCourier, setSelectedCourier] = useState<string>('jne'); // jne, pos, tiki
    const [shippingCosts, setShippingCosts] = useState<ShippingCostResult[]>([]);
    const [selectedService, setSelectedService] = useState<{ service: string, cost: number } | null>(null);
    const [calculatingShipping, setCalculatingShipping] = useState(false);
    const [shippingError, setShippingError] = useState<string | null>(null);

    // ----------------------------------

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

    // --- Delivery Logic ---
    const fetchAddresses = () => {
        axios.get(`${API_BASE_URL}/api/user/addresses`, { withCredentials: true })
            .then(res => {
                setAddresses(res.data);
                if (res.data.length > 0) {
                    const defaultAddr = res.data.find((a: UserAddress) => a.is_default) || res.data[0];
                    setSelectedAddressId(defaultAddr.id);
                }
            })
            .catch(err => console.error('Failed to fetch addresses:', err));
    };

    const calculateShipping = () => {
        if (!selectedAddressId || !selectedItem) return;

        // Find Address
        const selectedAddr = addresses.find(a => a.id === selectedAddressId);
        if (!selectedAddr) {
            console.error('[Marketplace] Address not found for ID:', selectedAddressId);
            return;
        }

        setCalculatingShipping(true);
        setShippingCosts([]);
        setSelectedService(null);

        // Item Origin: 'origin_city' from sheet (snake_case from header)
        const originCity = (selectedItem as any).origin_city_id || (selectedItem as any).origin_city || 'Jakarta Barat'; // Fallback

        // Use ID if available, otherwise name (backend will try to search name)
        const destValue = selectedAddr.address_city_id || selectedAddr.address_city_name;

        axios.post(`${API_BASE_URL}/api/shipping/cost?t=${Date.now()}`, {
            origin: originCity,
            destination: destValue,
            weight: parseInt(selectedItem.weight_gram || '1000') || 1000,
            courier: selectedCourier
        }, { withCredentials: true })
            .then(res => {
                console.log('[Marketplace] Shipping Response:', res.data);

                const responseArray = Array.isArray(res.data) ? res.data : [];
                setShippingCosts(responseArray);

                const hasCosts = responseArray.length > 0;

                if (!hasCosts) {
                    setShippingError(`No costs found.`);
                } else {
                    setShippingError(null);

                    // Auto-select first service (Smart Logic)
                    try {
                        let firstService = null;
                        // Case 1: Wrapped (Standard)
                        if ((responseArray[0] as any).costs && Array.isArray((responseArray[0] as any).costs)) {
                            firstService = (responseArray[0] as any).costs[0];
                        }
                        // Case 2: Flattened (Anomaly)
                        else if ((responseArray[0] as any).service) {
                            firstService = responseArray[0];
                        }

                        if (firstService?.cost && firstService.cost[0]) {
                            setSelectedService({ service: firstService.service, cost: firstService.cost[0].value });
                        }
                    } catch (e) {
                        console.warn('Auto-select failed', e);
                    }
                }
            })
            .catch(err => {
                console.error('[Marketplace] Shipping Error:', err);
                setShippingError(err.message || String(err));
            })
            .finally(() => setCalculatingShipping(false));
    };

    useEffect(() => {
        if (selectedItem) {
            fetchAddresses();
        }
    }, [selectedItem]);

    useEffect(() => {
        if (selectedAddressId && selectedCourier && selectedItem) {
            calculateShipping();
        }
    }, [selectedAddressId, selectedCourier]);

    const handleBuyClick = (item: Product, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent duplicate trigger
        setSelectedItem(item);
        setOrderQty(1);
    };

    const handleOrderSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        // Validation: Address & Shipping
        if (!selectedAddressId) {
            alert('Please select a shipping address.');
            return;
        }
        if (!selectedService) {
            alert('Please select a shipping service.');
            return;
        }

        setIsSubmitting(true);

        // Parse price (e.g. "Rp 50.000" -> 50000)
        const priceString = selectedItem.unit_price.replace(/[^0-9]/g, '');
        const unitPrice = parseInt(priceString) || 0;
        const shippingCost = selectedService.cost;
        const totalPrice = (unitPrice * orderQty) + shippingCost;

        try {
            // 1. Create Order in Backend (Pending Status)
            const orderRes = await axios.post(`${API_BASE_URL}/api/marketplace/order`, {
                itemName: selectedItem.product_name,
                unitPrice: selectedItem.unit_price,
                quantity: orderQty,
                totalPrice: `Rp ${totalPrice.toLocaleString('id-ID')}`,
                userName: userDetails.name,
                userEmail: userDetails.email,
                phone: userDetails.phone,
                supplierEmail: selectedItem.supplier_email,
                // Shipping
                shippingCost: shippingCost,
                shippingCourier: selectedCourier,
                shippingService: selectedService.service
            }, { withCredentials: true });

            if (!orderRes.data.success) throw new Error('Order creation failed');
            const { orderId } = orderRes.data;

            // 2. Request Payment Token
            const paymentRes = await axios.post(`${API_BASE_URL}/api/payment/charge`, {
                orderId: orderId,
                amount: totalPrice,
                customerDetails: {
                    first_name: userDetails.name,
                    email: userDetails.email,
                    phone: userDetails.phone
                },
                itemDetails: [
                    {
                        id: selectedItem.product_name.substring(0, 40), // Midtrans ID max length
                        price: unitPrice,
                        quantity: orderQty,
                        name: selectedItem.product_name.substring(0, 45) // Midtrans Name max length
                    },
                    {
                        id: 'SHIPPING',
                        price: shippingCost,
                        quantity: 1,
                        name: `Shipping: ${selectedCourier.toUpperCase()} ${selectedService.service}`
                    }
                ]
            }, { withCredentials: true });

            const { token, redirect_url } = paymentRes.data;
            console.log('Payment Token:', token);
            console.log('Payment URL:', redirect_url);

            // 3. Trigger Snap Popup OR Show Link
            if (window.snap) {
                window.snap.pay(token, {
                    onSuccess: function (result: any) {
                        console.log('Payment success', result);
                        alert('Payment Successful!');
                        setSelectedItem(null);
                        fetchItems();
                        navigate('/my-orders');
                    },
                    onPending: function (result: any) {
                        console.log('Payment pending', result);
                        alert('Order pending payment. Please check "My Orders".');
                        setSelectedItem(null);
                        fetchItems();
                        navigate('/my-orders');
                    },
                    onError: function (result: any) {
                        console.error('Payment error', result);
                        alert('Payment failed. Please try again.');
                    },
                    onClose: function () {
                        console.log('Customer closed the popup without finishing the payment');
                        alert(`Payment not completed. You can pay via this link: ${redirect_url}`);
                    }
                });
            } else {
                // Fallback: Redirect to payment link if Snap is not loaded
                if (redirect_url) {
                    const confirmRedirect = confirm('Payment gateway not loaded. Redirect to payment page?');
                    if (confirmRedirect) window.open(redirect_url, '_blank');
                } else {
                    alert('Payment gateway not loaded. Please refresh.');
                }
            }

        } catch (error) {
            console.error(error);
            alert('Failed to process order.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Helpers / Derived State for Render ---
    const getEstimatedTotal = () => {
        if (!selectedItem) return "Rp 0";
        const cleanPrice = parseInt(selectedItem.unit_price.replace(/[^0-9]/g, '')) || 0;
        const shipping = selectedService?.cost || 0;
        return `Rp ${(cleanPrice * orderQty + shipping).toLocaleString('id-ID')}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-10 relative">
            {/* Header Section */}
            <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-emerald-900 text-white pt-12 pb-20 px-6 md:px-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

                <div className="max-w-4xl mx-auto relative z-10 text-center md:text-left">
                    <h1 className="text-3xl font-bold mb-2">{t('marketplace.title')}</h1>
                    <p className="text-teal-100 text-sm mb-6">{t('marketplace.subtitle')}</p>

                    {/* Islamic Preamble / Muqaddimah */}
                    <div className="bg-teal-900/40 backdrop-blur-sm p-6 rounded-2xl border border-teal-700/50 mb-8 text-center">
                        <p className="text-lg font-arabic mb-4 leading-relaxed text-orange-100" dir="rtl">
                            Bismillāhirraḥmānirraḥīm.<br />
                            إِنَّ الْحَمْدَ ِللهِ، نَحْمَدُهُ وَنَسْتَعِيْنُهُ وَنَسْتَغْفِرُهُ، وَنَعُوْذُ بِاللهِ مِنْ شُرُوْرِ أَنْفُسِنَا وَمِنْ سَيِّئَاتِ أَعْمَالِنَا، مَنْ يَهْدِهِ اللهُ فَلاَ مُضِلَّ لَهُ، وَمَنْ يُضْلِلْ فَلاَ هَـادِيَ لَهُ، وَأَشْـهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيْكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ.
                        </p>
                    </div>

                    
                
                <div className="max-w-6xl mx-auto relative z-10 text-center mb-12">
                    <div className="bg-slate-900/40 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-amber-300/20 shadow-2xl">
                        <p className="text-3xl md:text-4xl mb-6 leading-relaxed text-amber-100" dir="rtl">سُوْقُ الْبَرَكَةِ</p>
                        <h1 className="text-xl md:text-2xl font-bold mb-3 tracking-wide">SYARIAH-BASED TERMS & CONDITIONS</h1>
                        <p className="text-amber-200 text-sm">Transaksi Berkah & Penuh Keberkahan</p>
                        <div className="h-1 w-24 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-6"></div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition group">
                        <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                            <svg className="w-10 h-10 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/></svg>
                        </div>
                        <h3 className="font-bold text-center mb-2 text-lg">Prinsip Adil & Transparan</h3>
                        <p className="text-xs text-center text-gray-300">(Fairness & Transparency)</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition group">
                        <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                            <svg className="w-10 h-10 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        </div>
                        <h3 className="font-bold text-center mb-2 text-lg">Akad Suka Sama Suka</h3>
                        <p className="text-xs text-center text-gray-300">(Mutual Consent)</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition group">
                        <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                            <svg className="w-10 h-10 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                        </div>
                        <h3 className="font-bold text-center mb-2 text-lg">Keberkahan & Amanah</h3>
                        <p className="text-xs text-center text-gray-300">(Blessing & Trust)</p>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10 mb-10">
                    <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 backdrop-blur-sm rounded-2xl p-6 border border-emerald-400/30">
                        <h3 className="font-bold text-amber-300 mb-2 text-lg">Kebijakan Pengembalian: Jaminan Ketenangan & Keberkahan</h3>
                        <p className="text-sm text-gray-200">RETURN POLICY: Tranquility & Blessedness Guaranteed</p>
                        <p className="text-xs text-gray-300 mt-3 italic">Kepuasan dan rida Anda adalah keberkahan kami</p>
                        <div className="mt-4 text-xs text-amber-200 bg-slate-900/40 inline-block px-4 py-2 rounded-full">
                            💰 Semua transaksi dalam <span className="font-bold">Rupiah Indonesia (IDR)</span>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto relative z-10">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('marketplace.search_placeholder')}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:bg-white/20 transition shadow-lg"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        </div>
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
                    <div className="col-span-full text-center py-20 text-gray-400">Loading Items...</div>
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
                            <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold z-10 ${item.stock_status?.toLowerCase().includes('pre')
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                                }`}>
                                {item.stock_status || 'Ready Stock'}
                            </div>
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

            {/* Order Modal - Restored */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
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
                                <div className="text-xs text-gray-500 mt-1">
                                    <span className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px] mr-2">
                                        Weight: {selectedItem.weight_gram ? `${selectedItem.weight_gram}g` : '1kg'}
                                    </span>
                                    <span>{selectedItem.stock_status || 'Ready Stock'}</span>
                                </div>
                            </div>
                        </div>

                        {/* 
                        <p className="font-bold text-red-600">DEBUG v1.7.10 (Scroll Fix)</p>
                        <div className="mt-1 border-t border-yellow-300 pt-1">
                             <p className="font-bold">Payload:</p>
                             <pre className="whitespace-pre-wrap break-all text-[9px] text-blue-800 bg-blue-50 p-1">
                                 {JSON.stringify(getDebugPayload(), null, 2)}
                             </pre>
                        </div>
                        <div className="mt-2 pt-2 border-t border-yellow-200">
                             <p className="font-bold">Raw Response:</p>
                             <pre className="whitespace-pre-wrap break-all text-[9px] text-gray-600">
                                 {JSON.stringify(shippingCosts.length > 0 ? shippingCosts : "EMPTY []", null, 2)}
                             </pre>
                        </div>
                         */}

                        {shippingError && (
                            <div className="mt-2 p-1 bg-red-100 text-red-600 font-bold border border-red-300">
                                ERROR: {shippingError}
                            </div>
                        )}

                        {/* Description */}
                        {selectedItem.description && (
                            <div className="bg-blue-50 p-3 rounded-xl mb-4 text-xs text-blue-800">
                                <span className="font-bold block mb-1">Description:</span>
                                {selectedItem.description}
                            </div>
                        )}

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

                            {/* --- Delivery Section --- */}
                            <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Shipping Address</label>
                                        <button type="button" onClick={() => navigate('/profile')} className="text-xs text-teal-600 font-bold hover:underline">+ Manage Addresses</button>
                                    </div>
                                    <select
                                        value={selectedAddressId}
                                        onChange={(e) => setSelectedAddressId(e.target.value)}
                                        className="w-full p-2 rounded-lg border border-gray-200 text-sm"
                                    >
                                        <option value="">Select Address...</option>
                                        {addresses.map(addr => (
                                            <option key={addr.id} value={addr.id}>
                                                {addr.label} - {addr.address_city_name}
                                            </option>
                                        ))}
                                    </select>
                                    {addresses.length === 0 && <p className="text-xs text-red-400 mt-1">Please add an address.</p>}
                                </div>

                                {selectedAddressId && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Courier</label>
                                            <div className="flex gap-2">
                                                {['jne', 'pos', 'tiki'].map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => setSelectedCourier(c)}
                                                        className={`flex-1 py-1 px-2 rounded-md text-sm font-bold uppercase border ${selectedCourier === c ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200'}`}
                                                    >
                                                        {c}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service</label>
                                            {calculatingShipping ? (
                                                <div className="text-xs text-gray-400 italic">Calculating costs...</div>
                                            ) : (
                                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                    {(() => {
                                                        let servicesToRender: any[] = [];

                                                        // Strategy 1: Wrapped (Courier -> Costs)
                                                        if (shippingCosts.length > 0 && (shippingCosts[0] as any).costs) {
                                                            servicesToRender = (shippingCosts[0] as any).costs;
                                                        }
                                                        // Strategy 2: Flattened (List of Services)
                                                        else if (shippingCosts.length > 0 && (shippingCosts[0] as any).service) {
                                                            servicesToRender = shippingCosts;
                                                        }

                                                        if (servicesToRender.length === 0) {
                                                            return <div className="text-xs text-gray-400">No services available.</div>;
                                                        }

                                                        return servicesToRender.map((sc: any, idx: number) => (
                                                            <div
                                                                key={idx}
                                                                onClick={() => setSelectedService({ service: sc.service, cost: sc.cost[0].value })}
                                                                className={`p-2 rounded-lg border cursor-pointer flex justify-between items-center hover:bg-teal-50 ${selectedService?.service === sc.service ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' : 'border-gray-200 bg-white'}`}
                                                            >
                                                                <div>
                                                                    <div className="font-bold text-sm text-gray-800">{sc.service}</div>
                                                                    <div className="text-xs text-gray-500">{sc.description} ({sc.cost[0]?.etd?.replace('HARI', '').replace('DAYS', '')} days)</div>
                                                                </div>
                                                                <div className="font-bold text-teal-700">Rp {sc.cost[0]?.value?.toLocaleString('id-ID')}</div>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Total Price Estimation */}
                            <div className="bg-teal-50 p-4 rounded-xl flex justify-between items-center">
                                <span className="text-teal-800 font-medium">Estimated Total</span>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-teal-900">
                                        {getEstimatedTotal()}
                                    </span>
                                    {selectedService && <div className="text-xs text-teal-600">(Inc. Shipping)</div>}
                                </div>
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
