import { assetUrl } from '../api/client';
import SharingBadges from '../components/SharingBadges';
import React from 'react';
import { Search, ShieldCheck, CreditCard, MapPin, Calendar, User, Lock, Headphones, Star, ChevronRight, Heart } from 'lucide-react';

export default function HomepageView({ onSearch, onSelectProperty, properties, searchQuery, setSearchQuery, checkInDate, setCheckInDate, checkOutDate, setCheckOutDate, guestCount, setGuestCount, favorites, onToggleFavorite }) {
  return (
    <div>
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300 py-3 hidden md:block text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between font-medium">
          <span className="text-white font-semibold">Find, Compare, Verify and Book Safe Accommodations for Students and Working Professionals.</span>
          <div className="flex items-center space-x-6 text-teal-400">
            <span className="flex items-center space-x-1"><Search className="w-3.5 h-3.5" /><span>Discover Stays</span></span>
            <span className="flex items-center space-x-1"><ShieldCheck className="w-3.5 h-3.5" /><span>Verified Owners</span></span>
            <span className="flex items-center space-x-1"><CreditCard className="w-3.5 h-3.5" /><span>Razorpay Secure</span></span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative bg-slate-900 text-white overflow-hidden py-16 lg:py-24 border-b border-slate-800">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="inline-block bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold text-xs px-3.5 py-1 rounded-full mb-4 uppercase tracking-wider">
              Trusted Accommodation Network
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4 leading-tight">
              Find Your Perfect <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-400 to-indigo-400">Stay, Safely</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
              PGs, Flats, Rooms, Hostels, Co-living & Hotels for Students and Working Professionals with verified property passports.
            </p>
          </div>

          <div className="bg-white text-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl max-w-4xl mx-auto border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <MapPin className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="w-full">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">City or Area</label>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none" placeholder="Bangalore, Koramangala..." />
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Calendar className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="w-full">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Check-in Date</label>
                  <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full" />
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <User className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="w-full">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Occupancy</label>
                  <select value={guestCount} onChange={(e) => setGuestCount(e.target.value)} className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer">
                    <option value="1 Guest">1 Guest (Single Room)</option>
                    <option value="2 Guests">2 Guests (Double Sharing)</option>
                    <option value="3+ Guests">3+ Guests (Flat / Group)</option>
                  </select>
                </div>
              </div>

              <button onClick={onSearch} className="w-full h-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition flex items-center justify-center space-x-2 text-sm sm:text-base">
                <Search className="w-5 h-5" />
                <span>Search Stays</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
                <div><span className="font-bold block text-slate-800">Verified Listings</span><span className="text-[11px] text-slate-400">Owner ID & Property Checked</span></div>
              </div>
              <div className="flex items-center space-x-2.5">
                <Lock className="w-5 h-5 text-blue-600 shrink-0" />
                <div><span className="font-bold block text-slate-800">Secure Payments</span><span className="text-[11px] text-slate-400">Razorpay Encrypted</span></div>
              </div>
              <div className="flex items-center space-x-2.5">
                <Headphones className="w-5 h-5 text-purple-600 shrink-0" />
                <div><span className="font-bold block text-slate-800">24/7 Support</span><span className="text-[11px] text-slate-400">Tenant Safety Assistance</span></div>
              </div>
              <div className="flex items-center space-x-2.5">
                <Star className="w-5 h-5 text-amber-500 shrink-0" />
                <div><span className="font-bold block text-slate-800">Trusted Feedback</span><span className="text-[11px] text-slate-400">Verified Resident Reviews</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Properties */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Popular Properties Nearby</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Top-rated safe accommodations near IT parks and educational hubs</p>
          </div>
          <button onClick={onSearch} className="text-teal-600 hover:text-teal-700 font-bold text-xs sm:text-sm flex items-center space-x-1 group bg-teal-50 px-4 py-2 rounded-xl transition">
            <span>View All Listings</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.filter(p => p.status === 'Active').slice(0, 3).map((prop) => (
            <div key={prop.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300 border border-slate-200 cursor-pointer flex flex-col justify-between group">
              <div>
                <div className="relative h-48 overflow-hidden" onClick={() => onSelectProperty(prop)}>
                  <img src={assetUrl(prop.image)} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  {prop.verified && (
                    <span className="absolute top-3 left-3 bg-teal-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>StaySafe Verified</span>
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(prop.id); }} className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow transition">
                    <Heart className={`w-4 h-4 ${favorites.includes(prop.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                </div>

                <div className="p-5" onClick={() => onSelectProperty(prop)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{prop.type}</span>
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{prop.rating} ({prop.reviewsCount})</span>
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition">{prop.name}</h3>
                  <p className="text-slate-500 text-xs flex items-center space-x-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{prop.location}</span>
                  </p>
                  <div className="mt-3"><SharingBadges property={prop} /></div>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {prop.amenities.map((am, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">{am}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Starting from</span>
                  <span className="text-base font-extrabold text-teal-700">₹{prop.price.toLocaleString()} <span className="text-xs font-normal text-slate-500">/bed/mo</span></span>
                </div>
                <button onClick={() => onSelectProperty(prop)} className="bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow">
                  View Stay
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
