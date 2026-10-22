import React, { useState, useEffect, useCallback } from 'react';
import { getAdminKyc, approveKyc, rejectKyc } from '../api/services';

const FILTERS = [
  { id: 'PENDING_REVIEW', label: 'Pending' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'ALL', label: 'All' }
];
const BADGE = { VERIFIED: 'bg-teal-100 text-teal-800', PENDING_REVIEW: 'bg-amber-100 text-amber-800', REJECTED: 'bg-rose-100 text-rose-700' };

/** Admin: review owner KYC submissions (manual entries need approval; CKYC matches are already verified). */
export default function KycReviewPanel({ showToast, onChanged }) {
  const [filter, setFilter] = useState('PENDING_REVIEW');
  const [rows, setRows] = useState([]);

  const load = useCallback(() => {
    getAdminKyc(filter).then(setRows).catch((e) => showToast(e.message));
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const approve = async (k) => {
    try { await approveKyc(k.id); showToast(`KYC approved for ${k.ownerName}`); load(); onChanged?.(); }
    catch (e) { showToast(e.message); }
  };
  const reject = async (k) => {
    const remarks = window.prompt(`Reason for rejecting ${k.ownerName}'s KYC (shown to the owner):`, 'Details do not match the ID provided.');
    if (remarks === null) return;
    try { await rejectKyc(k.id, remarks); showToast(`KYC rejected for ${k.ownerName}`); load(); onChanged?.(); }
    catch (e) { showToast(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === f.id ? 'bg-purple-600 text-white shadow' : 'text-slate-600'}`}>{f.label}</button>
        ))}
      </div>

      {rows.length === 0 && <p className="text-xs text-slate-400 font-semibold py-6 text-center">No KYC submissions in this list.</p>}

      <div className="space-y-3">
        {rows.map(k => (
          <div key={k.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 text-xs space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{k.ownerName} <span className="font-normal text-slate-400">• {k.ownerEmail}</span></h4>
                <span className="text-[10px] text-slate-400">Submitted {k.submittedAt?.slice(0, 16).replace('T', ' ')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${k.source === 'CKYC' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'}`}>{k.source === 'CKYC' ? 'CKYC match' : 'Manual entry'}</span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${BADGE[k.status]}`}>{k.status.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-700">
              <div><span className="block text-[10px] uppercase font-bold text-slate-400">ID</span><b>{k.idType.replace('_', ' ')} • {k.idMasked}</b></div>
              <div><span className="block text-[10px] uppercase font-bold text-slate-400">Name on ID</span><b>{k.fullName}</b></div>
              <div><span className="block text-[10px] uppercase font-bold text-slate-400">Date of birth</span><b>{k.dob}</b></div>
              <div><span className="block text-[10px] uppercase font-bold text-slate-400">CKYC number</span><b>{k.ckycNumber || '—'}</b></div>
              <div className="col-span-2 md:col-span-4"><span className="block text-[10px] uppercase font-bold text-slate-400">Address</span><b>{k.address}</b></div>
            </div>

            {k.remarks && <p className="text-slate-500"><b>Remarks:</b> {k.remarks}</p>}
            {k.fullName && k.ownerName && k.fullName.trim().toLowerCase() !== k.ownerName.trim().toLowerCase() && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Name on ID differs from the account name ({k.ownerName}). Check before approving.</p>
            )}

            {k.status === 'PENDING_REVIEW' && (
              <div className="flex justify-end space-x-2">
                <button onClick={() => reject(k)} className="bg-rose-50 text-rose-700 border border-rose-200 font-bold px-4 py-2 rounded-lg">Reject</button>
                <button onClick={() => approve(k)} className="bg-teal-600 text-white font-bold px-4 py-2 rounded-lg shadow hover:bg-teal-700">Approve</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
