import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { sharingLabel } from '../utils/sharing';

const input = 'w-full p-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-500';
const lbl = 'block text-[10px] font-bold uppercase text-slate-400 mb-0.5';

export const emptyRoom = (occupancy = 2) => ({ label: sharingLabel(occupancy), occupancy, pricePerBed: '', totalBeds: '', availableBeds: '', acRoom: false, attachedBathroom: false });

/** Owner: define room types (single / 2 / 3 sharing ...), price per bed and bed inventory. */
export default function RoomOptionsEditor({ rooms, onChange }) {
  const update = (i, patch) => onChange(rooms.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const setOccupancy = (i, n) => {
    const r = rooms[i];
    const wasDefault = !r.label || r.label === sharingLabel(Number(r.occupancy));
    update(i, { occupancy: n, ...(wasDefault ? { label: sharingLabel(n) } : {}) });
  };

  return (
    <div className="space-y-3">
      {rooms.map((r, i) => (
        <div key={r.id ?? `new-${i}`} className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="col-span-2">
              <span className={lbl}>Room name</span>
              <input className={input} value={r.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="e.g. Double sharing (AC)" required />
            </div>
            <div>
              <span className={lbl}>Sharing</span>
              <select className={input} value={r.occupancy} onChange={(e) => setOccupancy(i, Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{sharingLabel(n)}</option>)}
              </select>
            </div>
            <div>
              <span className={lbl}>₹ / bed / month</span>
              <input type="number" min="1" className={input} value={r.pricePerBed} onChange={(e) => update(i, { pricePerBed: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><span className={lbl}>Total beds</span><input type="number" min="1" className={input} value={r.totalBeds} onChange={(e) => update(i, { totalBeds: e.target.value })} required /></div>
              <div><span className={lbl}>Open now</span><input type="number" min="0" className={input} value={r.availableBeds} onChange={(e) => update(i, { availableBeds: e.target.value })} required /></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-slate-600">
              <label className="flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" className="accent-teal-600" checked={r.acRoom} onChange={(e) => update(i, { acRoom: e.target.checked })} /><span>AC</span></label>
              <label className="flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" className="accent-teal-600" checked={r.attachedBathroom} onChange={(e) => update(i, { attachedBathroom: e.target.checked })} /><span>Attached bathroom</span></label>
            </div>
            {rooms.length > 1 && (
              <button type="button" onClick={() => onChange(rooms.filter((_, k) => k !== i))} className="flex items-center space-x-1 text-[11px] font-bold text-rose-600 hover:underline">
                <Trash2 className="w-3 h-3" /><span>Remove</span>
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rooms, emptyRoom(rooms.length ? Math.min(6, Number(rooms[rooms.length - 1].occupancy) + 1) : 2)])}
        className="flex items-center space-x-1.5 text-xs font-bold text-teal-700 border border-dashed border-teal-400 rounded-lg px-3 py-2 hover:bg-teal-50">
        <Plus className="w-4 h-4" /><span>Add another room type</span>
      </button>
      <p className="text-[11px] text-slate-400">"Open now" = beds available for online booking. Beds drop automatically when a customer books and come back on cancellation.</p>
    </div>
  );
}
