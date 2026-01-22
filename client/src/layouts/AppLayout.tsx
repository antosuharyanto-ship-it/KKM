import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import Hook
import { Tent, ShoppingBag, User, Search, LayoutDashboard, Megaphone, MessageSquare, Moon, Instagram, Facebook, Youtube, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher'; // Import Switcher

export const AppLayout: React.FC = () => {
    const { t } = useTranslation(); // Use Hook

    return (
        <div className="flex flex-col h-[100dvh] bg-stone-50 text-gray-900 shadow-2xl relative overflow-hidden md:h-screen md:overflow-visible md:shadow-none">

            {/* Desktop Header */}
            <header className="hidden md:flex items-center justify-between px-8 py-4 bg-teal-800 text-white shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <img src="/logo.jpg" alt="KKM Logo" className="w-10 h-10 rounded-full border-2 border-orange-400/50" />
                    <span className="font-bold text-xl tracking-wide text-orange-50">Kemah Keluarga Muslim</span>
                </div>

                <nav className="flex items-center gap-6">
                    <DesktopNavItem to="/" label={t('nav.events')} />
                    <DesktopNavItem to="/news" label={t('nav.news')} />
                    <DesktopNavItem to="/community" label={t('nav.community')} />
                    <DesktopNavItem to="/islamic-tools" label={t('nav.prayer')} />
                    <DesktopNavItem to="/marketplace" label={t('nav.marketplace')} />
                    <DesktopNavItem to="/scanner" label={t('nav.scan')} />
                    <DesktopNavItem to="/dashboard" label={t('nav.dashboard')} />
                </nav>

                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    <button className="p-2 hover:bg-white/10 rounded-full transition">
                        <Search size={20} />
                    </button>
                    <NavLink to="/profile" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-full transition font-semibold text-sm shadow-sm">
                        <User size={18} />
                        <span>{t('nav.profile')}</span>
                    </NavLink>
                </div>
            </header>

            {/* Main Content Area */}
            {/* On mobile: fixed height container. On Desktop: natural height with max-width wrapper */}
            <div className="flex-1 md:w-full md:max-w-7xl md:mx-auto overflow-hidden md:overflow-visible">
                <main className="h-full overflow-y-auto pb-20 no-scrollbar md:pb-0 md:h-auto md:overflow-visible">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3 flex justify-between items-center z-50 rounded-t-2xl shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                <MobileNavItem to="/" icon={<Tent size={20} />} label={t('nav.events')} />
                <MobileNavItem to="/news" icon={<Megaphone size={20} />} label={t('nav.news')} />
                <MobileNavItem to="/community" icon={<MessageSquare size={20} />} label={t('nav.community')} />
                <MobileNavItem to="/islamic-tools" icon={<Moon size={20} />} label={t('nav.prayer')} />
                <MobileNavItem to="/marketplace" icon={<ShoppingBag size={20} />} label={t('nav.marketplace')} />
                <MobileNavItem to="/dashboard" icon={<LayoutDashboard size={20} />} label={t('nav.dashboard')} />
                <MobileNavItem to="/profile" icon={<User size={20} />} label={t('nav.profile')} />
            </nav>

            {/* Rich Footer (Visible on Desktop) */}
            <footer className="hidden md:block bg-teal-900 text-white pt-12 pb-6 px-12 mt-auto border-t border-teal-800">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <img src="/logo.jpg" alt="KKM Logo" className="w-12 h-12 rounded-full border-2 border-orange-400" />
                            <span className="font-bold text-2xl tracking-wide text-orange-50">Kemah Keluarga Muslim</span>
                        </div>
                        <p className="text-teal-200 text-sm leading-relaxed max-w-sm mb-6">
                            Building stronger families through faith, nature, and togetherness. Join our community events to create everlasting memories.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-teal-800 flex items-center justify-center hover:bg-orange-500 transition-colors text-white"><Instagram size={18} /></a>
                            <a href="#" className="w-10 h-10 rounded-full bg-teal-800 flex items-center justify-center hover:bg-orange-500 transition-colors text-white"><Facebook size={18} /></a>
                            <a href="#" className="w-10 h-10 rounded-full bg-teal-800 flex items-center justify-center hover:bg-orange-500 transition-colors text-white"><Youtube size={18} /></a>
                            <a href="#" className="w-10 h-10 rounded-full bg-teal-800 flex items-center justify-center hover:bg-orange-500 transition-colors text-white"><Twitter size={18} /></a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-lg mb-4 text-orange-200">Quick Links</h4>
                        <ul className="space-y-2 text-sm text-teal-100">
                            <li><NavLink to="/" className="hover:text-orange-400 transition">Upcoming Events</NavLink></li>
                            <li><NavLink to="/news" className="hover:text-orange-400 transition">Latest News</NavLink></li>
                            <li><NavLink to="/community" className="hover:text-orange-400 transition">Community Wall</NavLink></li>
                            <li><NavLink to="/marketplace" className="hover:text-orange-400 transition">Marketplace</NavLink></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold text-lg mb-4 text-orange-200">Contact Us</h4>
                        <ul className="space-y-4 text-sm text-teal-100">
                            <li className="flex items-start gap-3">
                                <MapPin size={18} className="text-orange-500 shrink-0 mt-0.5" />
                                <span>Jakarta, Indonesia</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail size={18} className="text-orange-500 shrink-0" />
                                <a href="mailto:info@kemahkeluargamuslim.com" className="hover:text-white">info@kemahkeluargamuslim.com</a>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone size={18} className="text-orange-500 shrink-0" />
                                <a href="tel:+6282112205227" className="hover:text-white">+62 821-1220-5227</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-teal-800/50 pt-6 text-center text-xs text-teal-400">
                    <p>&copy; {new Date().getFullYear()} Kemah Keluarga Muslim. All rights reserved. | Powered by Mastery AI by Abu Fatih</p>
                </div>
            </footer>
        </div>
    );
};

const MobileNavItem = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex flex-col items-center gap-1 transition-all duration-300 ${isActive
                ? 'text-teal-800 translate-y-[-2px]'
                : 'text-gray-400 hover:text-teal-600'
            }`
        }
    >
        {icon}
        <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </NavLink>
);

const DesktopNavItem = ({ to, label }: { to: string, label: string }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `text-sm font-medium transition-colors hover:text-orange-300 ${isActive ? 'text-white border-b-2 border-orange-400 pb-1' : 'text-teal-100'}`
        }
    >
        {label}
    </NavLink>
);
