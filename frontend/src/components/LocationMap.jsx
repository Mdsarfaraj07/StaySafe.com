import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const INDIA = [20.5937, 78.9629];
const round = (n) => Math.round(n * 1e6) / 1e6;

/**
 * OpenStreetMap (Leaflet) map. editable=true: click the map or drag the pin to choose a location.
 * Tiles come from tile.openstreetmap.org - fine for development / light use; use a tile provider
 * (MapTiler, Mapbox, Stadia...) for heavy production traffic.
 */
export default function LocationMap({ lat, lng, editable = false, onChange, height = 280 }) {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const ensureMarker = (latlng) => {
    if (marker.current) { marker.current.setLatLng(latlng); return; }
    marker.current = L.marker(latlng, { draggable: editable }).addTo(map.current);
    if (editable) {
      marker.current.on('dragend', () => {
        const p = marker.current.getLatLng();
        onChangeRef.current?.({ lat: round(p.lat), lng: round(p.lng) });
      });
    }
  };

  useEffect(() => {
    const has = typeof lat === 'number' && typeof lng === 'number';
    const m = L.map(el.current, { scrollWheelZoom: false }).setView(has ? [lat, lng] : INDIA, has ? 15 : 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(m);
    map.current = m;
    if (has) ensureMarker([lat, lng]);
    if (editable) {
      m.on('click', (e) => {
        ensureMarker(e.latlng);
        onChangeRef.current?.({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) });
      });
    }
    const t = setTimeout(() => m.invalidateSize(), 250);   // map may be mounted inside a modal
    return () => { clearTimeout(t); m.remove(); map.current = null; marker.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // follow coordinates changed from outside (address search / "use my location")
  useEffect(() => {
    if (!map.current || typeof lat !== 'number' || typeof lng !== 'number') return;
    ensureMarker([lat, lng]);
    map.current.setView([lat, lng], Math.max(map.current.getZoom(), 15));
  }, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} style={{ height }} className="w-full rounded-xl border border-slate-200 z-0" />;
}
