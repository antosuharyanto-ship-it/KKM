import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setIsOpen(false);
        // FORCE LTR
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = lng;
    };

    // Ensure LTR is enforced on mount/change
    useEffect(() => {
        document.documentElement.dir = 'ltr';
    }, [i18n.language]);

    return (
        <div className="relative group">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-2 rounded-full hover:bg-white/10 transition text-teal-100"
            >
                <Globe size={20} />
                <span className="uppercase text-xs font-bold">{i18n.language === 'id-ID' ? 'ID' : i18n.language.split('-')[0]}</span>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2">
                    <button
                        onClick={() => changeLanguage('en')}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${i18n.resolvedLanguage?.startsWith('en') ? 'font-bold text-teal-800' : 'text-gray-600'}`}
                    >
                        English
                    </button>
                    <button
                        onClick={() => changeLanguage('id')}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${i18n.resolvedLanguage === 'id' ? 'font-bold text-teal-800' : 'text-gray-600'}`}
                    >
                        Indonesia
                    </button>
                    <button
                        onClick={() => changeLanguage('ar')}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${i18n.resolvedLanguage === 'ar' ? 'font-bold text-teal-800' : 'text-gray-600'}`}
                    >
                        العربية
                    </button>
                </div>
            )}
        </div>
    );
};
