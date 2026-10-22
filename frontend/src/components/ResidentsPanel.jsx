import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { getOwnerProperties, getResidents, addResident, updateResident, deleteResident } from '../api/services';
import { GENDER, OCCUPATION, FOOD, FOOD_EMOJI, SLEEP } from '../utils/sharing';

const input = 'w-full p-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-500';
const lbl = 'block text-[10px] font-bold uppercase text-slate-400 mb-0.5';
const blank = { roomId: '', name: '', gender: 'MALE', age: '', occupation: 'STUDENT', organization: '', foodPreference: 'VEG', smokes: false, drinks: false, sleepSchedule: '', bio: '', moveInDate: '', consent: false };

const Select = ({ value, options, onChange }) => (
  <select className={input} value={value} onChange={(e) => onChange(e.target.value)}>
    {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
  </select>
);

/** Owner: manage the current residents / flatmates prospective tenants see as "roommates". */
export default function ResidentsPanel({ showToast }) {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState(null);
  const [residents, setResidents] = useState([]);
  const [editing, setEditing] = useState(null);       // null | {} (new) | resident
  const [form, setForm] = useState(blank);

  useEffect(() => {
    getOwnerProperties().then((list) => { setProperties(list); if (list.length) setPropertyId(list[0].id); }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (propertyId) getResidents(propertyId).then(setResidents).catch((e) => showToast(e.message));
  }, [propertyId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const property = properties.find(p => p.id === propertyId);

  const open = (r) => {
    setEditing(r || {});
    setForm(r ? { ...blank, ...r, roomId: r.roomId ?? '', organization: r.organization || '', sleepSchedule: r.sleepSchedule || '', bio: r.bio || '', moveInDate: r.moveInDate || '', consent: true } : blank);
  };

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, roomId: form.roomId ? Number(form.roomId) : null, age: Number(form.age), sleepSchedule: form.sleepSchedule || null, moveInDate: form.moveInDate || null };
    try {
      if (editing.id) await updateResident(propertyId, editing.id, body); else await addResident(propertyId, body);
      setEditing(null);
      load();
      showToast('Resident saved');
    } catch (err) { showToast(err.message); }
  };

  const remove = async (r) => {
    if (!window.confirm(`Remove ${r.name}?`)) return;
    try { await deleteResident(propertyId, r.id); load(); } catch (err) { showToast(err.message); }
  };

  if (properties.length === 0) return <p className="text-xs text-slate-400">Add a property first to manage its residents.</p>;
  const set = (patch) => setForm({ ...form, ...patch });

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-500 uppercase text-[10px]">Property</span>
          <select className="p-2 rounded-lg border border-slate-200 text-xs" value={propertyId || ''} onChange={(e) => setPropertyId(Number(e.target.value))}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={() => open(null)} className="flex items-center space-x-1.5 bg-teal-600 text-white font-bold px-3 py-2 rounded-lg"><Plus className="w-4 h-4" /><span>Add resident</span></button>
      </div>
      <p className="text-slate-500">Residents you add here appear as <b>roommates</b> to people considering this property (first name + last initial, age group and lifestyle basics only). Add only residents who agreed to share.</p>

      <div className="space-y-2">
        {residents.length === 0 && <p className="text-slate-400">No residents added yet.</p>}
        {residents.map(r => (
          <div key={r.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
            <div>
              <b className="text-slate-900">{r.name}</b> <span className="text-slate-400">• {GENDER[r.gender]}, {r.age} • {OCCUPATION[r.occupation]}{r.organization ? ` (${r.organization})` : ''}</span>
              <p className="text-slate-500">{FOOD_EMOJI[r.foodPreference]} {FOOD[r.foodPreference]} • {r.roomLabel || 'Any room'}{r.moveInDate ? ` • since ${r.moveInDate}` : ''}</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => open(r)} className="border border-slate-200 bg-white font-bold px-3 py-1.5 rounded-lg">Edit</button>
              <button onClick={() => remove(r)} className="text-rose-600 font-bold px-2">Remove</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-start justify-center p-4 overflow-y-auto">
          <form onSubmit={save} className="bg-white p-6 rounded-2xl max-w-xl w-full shadow-2xl space-y-3 border border-slate-200 my-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">{editing.id ? 'Edit resident' : 'Add resident / flatmate'}</h3>
              <button type="button" onClick={() => setEditing(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className={lbl}>Full name</span><input className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} required /></div>
              <div><span className={lbl}>Room</span>
                <select className={input} value={form.roomId} onChange={(e) => set({ roomId: e.target.value })}>
                  <option value="">Not specified</option>
                  {(property?.rooms || []).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select></div>
              <div><span className={lbl}>Gender</span><Select value={form.gender} options={GENDER} onChange={(v) => set({ gender: v })} /></div>
              <div><span className={lbl}>Age</span><input type="number" min="16" max="90" className={input} value={form.age} onChange={(e) => set({ age: e.target.value })} required /></div>
              <div><span className={lbl}>Occupation</span><Select value={form.occupation} options={OCCUPATION} onChange={(v) => set({ occupation: v })} /></div>
              <div><span className={lbl}>College / company</span><input className={input} value={form.organization} onChange={(e) => set({ organization: e.target.value })} /></div>
              <div><span className={lbl}>Food preference</span><Select value={form.foodPreference} options={FOOD} onChange={(v) => set({ foodPreference: v })} /></div>
              <div><span className={lbl}>Sleep schedule</span>
                <select className={input} value={form.sleepSchedule} onChange={(e) => set({ sleepSchedule: e.target.value })}>
                  <option value="">Not specified</option>
                  {Object.entries(SLEEP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><span className={lbl}>Living here since</span><input type="date" className={input} value={form.moveInDate} onChange={(e) => set({ moveInDate: e.target.value })} /></div>
              <div className="flex items-end space-x-4 pb-2">
                <label className="flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" className="accent-teal-600" checked={form.smokes} onChange={(e) => set({ smokes: e.target.checked })} /><span>Smokes</span></label>
                <label className="flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" className="accent-teal-600" checked={form.drinks} onChange={(e) => set({ drinks: e.target.checked })} /><span>Drinks</span></label>
              </div>
            </div>
            <div><span className={lbl}>Short bio</span><textarea className={`${input} h-14`} value={form.bio} onChange={(e) => set({ bio: e.target.value })} /></div>
            <label className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 cursor-pointer">
              <input type="checkbox" className="accent-teal-600 mt-0.5" checked={form.consent} onChange={(e) => set({ consent: e.target.checked })} />
              <span>This resident has agreed to share these details with people considering this property.</span>
            </label>
            <div className="flex space-x-2 pt-1">
              <button type="button" onClick={() => setEditing(null)} className="w-full bg-slate-100 font-bold py-2.5 rounded-lg">Cancel</button>
              <button className="w-full bg-teal-600 text-white font-bold py-2.5 rounded-lg shadow hover:bg-teal-700">Save resident</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
