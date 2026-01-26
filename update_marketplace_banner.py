#!/usr/bin/env python3
"""
Quick script to update marketplace banner with Islamic Sy ariah principles.
Run this in the KKM project root directory.
"""

import re

file_path = "client/src/pages/MarketplacePage.tsx"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the old div content (lines 344-356 approximately)
old_pattern = r'(<div className="max-w-4xl mx-auto relative z-10 text-center md:text-left">.*?)<div className="max-w-2xl mx-auto relative z-10">'

new_content =  r'''\1
                
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

                <div className="max-w-2xl mx-auto relative z-10">'''

# Replace using regex with DOTALL flag
content = re.sub(old_pattern, new_content, content, flags=re.DOTALL)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Marketplace banner updated successfully!")
print("Now run: git add -A && git commit -m 'feat: add Islamic Syariah banner' && git push origin main")
