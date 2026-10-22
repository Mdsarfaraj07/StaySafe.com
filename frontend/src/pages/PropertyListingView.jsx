import { assetUrl } from '../api/client';
import React, { useState } from 'react';
import { Search, Filter, AlertCircle, ShieldCheck, Heart, MapPin, ChevronRight } from 'lucide-react';
import SharingBadges from '../components/SharingBadges';
import { matchesSharingFilters } from '../utils/sharing';

const PRESETS = [
  { label: 'Any budget', min: '', max: '' },
  { label: 'Under ₹8k', min: '', max: '8000' },
  { label: '₹8k – ₹12k', min: '8000', max: '12000' },
  { label: '₹12k – ₹18k', min: '12000', max: '18000' },
  { label: '₹18k & above', min: '18000', max: '' }
];
const DEFAULT_FILTERS = { gender: 'ANY', food: 'ANY', tenant: 'ANY', occupancy: 'ANY', availableOnly: false };
const digits = (v) => v.replace(/\D/g, '').slice(0, 7);
const selectCls = 'w-full bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500';
const heading = 'block text-xs font-bold uppercase text-slate-400 mb-2';

export default function PropertyListingView({ properties, onSelectProperty, favorites, onToggleFavorite }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [minPrice, setMinPrice] = useState('');           // empty = 0
  const [maxPrice, setMaxPrice] = useState('');           // empty = unlimited
  const [sf, setSf] = useState(DEFAULT_FILTERS);          // sharing filters
  const min = minPrice === '' ? 0 : Number(minPrice);
  const max = maxPrice === '' ? Infinity : Number(maxPrice);
  const invalidRange = min > max;

  const filtered = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All' || p.type === selectedType;
    const matchesPrice = p.price >= min && p.price <= max;
    return matchesSearch && matchesType && matchesPrice && matchesSharingFilters(p, sf) && p.status === 'Active';
  });

  const reset = () => { setSelectedType('All'); setMinPrice(''); setMaxPrice(''); setSearchTerm(''); setSf(DEFAULT_FILTERS); };
  const sel = (k, options) => (
    <select className={selectCls} value={sf[k]} onChange={(e) => setSf({ ...sf, [k]: e.target.value })}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto flex-1">
          <Search className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
          <input type="text" placeholder="Search by area, landmark or PG name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent text-sm font-medium focus:outline-none" />
        </div>
        <div className="text-xs text-slate-500 font-semibold">Found <span className="text-slate-900 font-bold">{filtered.length} verified stays</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center space-x-2 text-sm"><Filter className="w-4 h-4 text-teal-600" /><span>Filters</span></h3>
            <button onClick={reset} className="text-xs text-teal-600 hover:underline font-semibold">Reset</button>
          </div>

          <div>
            <label className={heading}>Property Type</label>
            <div className="space-y-2 text-xs font-semibold">
              {['All', 'PG', 'Room', 'Flat', 'Co-living'].map((type) => (
                <label key={type} className="flex items-center space-x-3 cursor-pointer text-slate-700">
                  <input type="radio" name="type" checked={selectedType === type} onChange={() => setSelectedType(type)} className="accent-teal-600" /><span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <label className={heading}>Sharing & roommates</label>
            <div><span className="block text-[10px] font-bold text-slate-400 mb-1">Sharing type</span>
              {sel('occupancy', [['ANY', 'Any'], ['1', 'Single room'], ['2', 'Double sharing'], ['3', 'Triple sharing'], ['4', '4+ sharing']])}</div>
            <div><span className="block text-[10px] font-bold text-slate-400 mb-1">Suitable for</span>
              {sel('gender', [['ANY', 'Anyone'], ['MALE', 'Men'], ['FEMALE', 'Women'], ['CO_ED', 'Co-ed only']])}</div>
            <div><span className="block text-[10px] font-bold text-slate-400 mb-1">Food</span>
              {sel('food', [['ANY', 'Any'], ['VEG_ONLY', 'Pure veg only'], ['NON_VEG_ALLOWED', 'Non-veg allowed']])}</div>
            <div><span className="block text-[10px] font-bold text-slate-400 mb-1">Occupants</span>
              {sel('tenant', [['ANY', 'Any'], ['STUDENTS', 'Students'], ['WORKING_PROFESSIONALS', 'Working professionals']])}</div>
            <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input type="checkbox" className="accent-teal-600" checked={sf.availableOnly} onChange={(e) => setSf({ ...sf, availableOnly: e.target.checked })} /><span>Only with beds available</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <label className={heading}>Budget per bed / month: ₹{min.toLocaleString()} – {max === Infinity ? 'Unlimited' : `₹${max.toLocaleString()}`}</label>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="block text-[10px] font-bold text-slate-400 mb-1">Min (₹)</span>
                <input inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(digits(e.target.value))} placeholder="0" className={selectCls} /></div>
              <div><span className="block text-[10px] font-bold text-slate-400 mb-1">Max (₹)</span>
                <input inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(digits(e.target.value))} placeholder="Unlimited" className={selectCls} /></div>
            </div>
            {invalidRange && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Minimum is higher than maximum.</p>}
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => {
                const active = minPrice === p.min && maxPrice === p.max;
                return (
                  <button key={p.label} onClick={() => { setMinPrice(p.min); setMaxPrice(p.max); }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${active ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'}`}>{p.label}</button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center border border-slate-200">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800">No properties match your filter</h3>
              <p className="text-slate-500 text-xs mt-1">Try widening your budget or relaxing the sharing filters.</p>
            </div>
          ) : filtered.map((prop) => (
            <div key={prop.id} onClick={() => onSelectProperty(prop)} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-xl transition border border-slate-200 flex flex-col sm:flex-row gap-6 cursor-pointer group">
              <div className="relative w-full sm:w-64 h-44 rounded-xl overflow-hidden shrink-0">
                <img src={assetUrl(prop.image)} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                {prop.verified && (
                  <span className="absolute top-2 left-2 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center space-x-1"><ShieldCheck className="w-3 h-3" /><span>Verified</span></span>
                )}
                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(prop.id); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 text-slate-700 shadow">
                  <Heart className={`w-3.5 h-3.5 ${favorites.includes(prop.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{prop.type}</span>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition mt-1">{prop.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>{prop.location}</span></p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400">from</span>
                      <span className="text-lg font-black text-teal-700">₹{prop.price.toLocaleString()}</span>
                      <span className="block text-[10px] text-slate-400">/ bed / month</span>
                    </div>
                  </div>
                  <div className="mt-3"><SharingBadges property={prop} /></div>
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2">{prop.description}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 mt-4 gap-2">
                  <span className={`text-[11px] font-bold ${prop.bedsAvailable > 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                    {prop.bedsAvailable > 0 ? `${prop.bedsAvailable} bed${prop.bedsAvailable === 1 ? '' : 's'} available` : 'Fully occupied'}
                  </span>
                  <span className="text-xs font-bold text-teal-600 group-hover:translate-x-1 transition flex items-center space-x-1"><span>View & Book</span><ChevronRight className="w-4 h-4" /></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
