import React, { useState } from 'react';
import { Search, LocateFixed } from 'lucide-react';
import LocationMap from './LocationMap';

const NOMINATIM = 'https://nominatim.openstreetmap.org';   // OpenStreetMap geocoding (user-triggered requests only)

const parts = (a = {}) => ({
  area: a.suburb || a.neighbourhood || a.city_district || a.village || '',
  city: a.city || a.town || a.state_district || a.county || ''
});

async function geocode(q) {
  const r = await fetch(`${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('search failed');
  return r.json();
}
async function reverse(lat, lng) {
  const r = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`);
  if (!r.ok) throw new Error('reverse failed');
  return r.json();
}

/** Search an address, use the browser location, or click / drag the pin. */
export default function LocationPicker({ lat, lng, onChange, onAddress, showToast }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (q.trim().length < 3) { showToast('Type at least 3 characters to search'); return; }
    setBusy(true);
    try {
      const rows = await geocode(q.trim());
      setResults(rows);
      if (rows.length === 0) showToast('No place found. Try a landmark or pin it on the map.');
    } catch { showToast('Address search is unavailable right now. Pin the location on the map instead.'); }
    finally { setBusy(false); }
  };

  const choose = (r) => {
    setResults([]);
    onChange({ lat: Math.round(+r.lat * 1e6) / 1e6, lng: Math.round(+r.lon * 1e6) / 1e6 });
    onAddress?.({ address: r.display_name, ...parts(r.address) });
  };

  const pinned = async (pt) => {
    onChange(pt);
    try { const r = await reverse(pt.lat, pt.lng); onAddress?.({ address: r.display_name, ...parts(r.address) }); } catch { /* optional */ }
  };

  const locate = () => {
    if (!navigator.geolocation) { showToast('Location is not supported by this browser'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => pinned({ lat: Math.round(pos.coords.latitude * 1e6) / 1e6, lng: Math.round(pos.coords.longitude * 1e6) / 1e6 }),
      () => showToast('Could not get your location. Allow location access or pin it manually.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <form onSubmit={search} className="flex gap-2">
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search address or landmark..." className="w-full bg-transparent py-2.5 text-xs focus:outline-none" />
        </div>
        <button className="bg-slate-900 text-white font-bold px-3 rounded-lg text-xs">{busy ? '...' : 'Search'}</button>
        <button type="button" onClick={locate} title="Use my current location" className="border border-slate-200 rounded-lg px-3 text-slate-600 hover:text-teal-600"><LocateFixed className="w-4 h-4" /></button>
      </form>

      {results.length > 0 && (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white max-h-40 overflow-y-auto">
          {results.map(r => (
            <button type="button" key={r.place_id} onClick={() => choose(r)} className="block w-full text-left text-[11px] text-slate-700 p-2 hover:bg-teal-50">{r.display_name}</button>
          ))}
        </div>
      )}

      <LocationMap lat={lat} lng={lng} editable onChange={pinned} height={260} />
      <p className="text-[11px] text-slate-500">
        {typeof lat === 'number' ? <>Pin set at <b>{lat}, {lng}</b> — drag the pin to fine-tune.</> : <span className="text-amber-700 font-semibold">Click on the map (or search) to drop a pin on your property.</span>}
      </p>
    </div>
  );
}
