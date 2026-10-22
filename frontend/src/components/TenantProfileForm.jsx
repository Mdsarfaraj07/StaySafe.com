import React, { useState, useEffect } from 'react';
import { getTenantProfile, saveTenantProfile } from '../api/services';
import { GENDER, OCCUPATION, FOOD, SLEEP } from '../utils/sharing';

const input = 'w-full bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-500';
const lbl = 'block text-[10px] font-bold uppercase text-slate-400 mb-1';

const maxDob = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().slice(0, 10); };

function Pills({ value, options, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(options).map(([k, label]) => (
        <button type="button" key={k} onClick={() => onChange(k)}
          className={`px-3 py-1.5 rounded-full border text-xs font-bold transition ${value === k ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'}`}>{label}</button>
      ))}
    </div>
  );
}

/** Customer's roommate profile: gender, DOB, occupation, food, habits. Required to book a bed. */
export default function TenantProfileForm({ onSaved, showToast, submitLabel = 'Save roommate profile' }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTenantProfile().then(p => setForm({
      gender: p.gender || '', dob: p.dob || '', occupation: p.occupation || '', organization: p.organization || '',
      foodPreference: p.foodPreference || '', smokes: !!p.smokes, drinks: !!p.drinks, sleepSchedule: p.sleepSchedule || '',
      languages: p.languages || '', bio: p.bio || '', shareWithRoommates: p.shareWithRoommates !== false
    })).catch((e) => showToast(e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return <p className="text-xs text-slate-400">Loading...</p>;
  const set = (patch) => setForm({ ...form, ...patch });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.gender || !form.occupation || !form.foodPreference || !form.dob) { showToast('Fill gender, date of birth, occupation and food preference'); return; }
    setSaving(true);
    try {
      const saved = await saveTenantProfile({ ...form, sleepSchedule: form.sleepSchedule || null });
      showToast('Roommate profile saved');
      onSaved?.(saved);
    } catch (err) { showToast(err.message); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4 text-xs">
      <div><span className={lbl}>Gender *</span><Pills value={form.gender} options={GENDER} onChange={(v) => set({ gender: v })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><span className={lbl}>Date of birth * (18+)</span><input type="date" max={maxDob()} className={input} value={form.dob} onChange={(e) => set({ dob: e.target.value })} required /></div>
        <div><span className={lbl}>College / company</span><input className={input} value={form.organization} onChange={(e) => set({ organization: e.target.value })} placeholder="e.g. Christ University / Infosys" /></div>
      </div>
      <div><span className={lbl}>I am a *</span><Pills value={form.occupation} options={OCCUPATION} onChange={(v) => set({ occupation: v })} /></div>
      <div><span className={lbl}>Food preference *</span><Pills value={form.foodPreference} options={FOOD} onChange={(v) => set({ foodPreference: v })} /></div>
      <div><span className={lbl}>Sleep schedule</span><Pills value={form.sleepSchedule} options={SLEEP} onChange={(v) => set({ sleepSchedule: v })} /></div>
      <div className="flex items-center space-x-6">
        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" className="accent-teal-600" checked={form.smokes} onChange={(e) => set({ smokes: e.target.checked })} /><span>I smoke</span></label>
        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" className="accent-teal-600" checked={form.drinks} onChange={(e) => set({ drinks: e.target.checked })} /><span>I drink alcohol</span></label>
      </div>
      <div><span className={lbl}>Languages</span><input className={input} value={form.languages} onChange={(e) => set({ languages: e.target.value })} placeholder="English, Hindi, Kannada" /></div>
      <div><span className={lbl}>About me</span><textarea className={`${input} h-16`} value={form.bio} onChange={(e) => set({ bio: e.target.value })} placeholder="A line or two your future roommates would like to know" /></div>

      <label className="flex items-start space-x-2 p-3 bg-teal-50 border border-teal-200 rounded-lg text-[11px] text-teal-900 cursor-pointer">
        <input type="checkbox" className="accent-teal-600 mt-0.5" checked={form.shareWithRoommates} onChange={(e) => set({ shareWithRoommates: e.target.checked })} />
        <span>Show my <b>first name, age group, occupation, food preference and habits</b> to people considering the property I book. My phone, email and exact age are never shared.</span>
      </label>

      <button disabled={saving} className="bg-teal-600 text-white font-bold px-5 py-2.5 rounded-lg shadow hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : submitLabel}</button>
    </form>
  );
}
