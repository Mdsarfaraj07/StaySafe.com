import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { searchAdminUsers, getAdminUser, toggleAdminUser } from '../api/services';
import { exportCsv, exportXlsx } from '../utils/export';
import ExportButtons from './ExportButtons';

const ROLES = [
  { id: 'ALL', label: 'All' },
  { id: 'CUSTOMER', label: 'Customers' },
  { id: 'OWNER', label: 'Owners' },
  { id: 'ADMIN', label: 'Admins' }
];
const ROLE_BADGE = { CUSTOMER: 'bg-teal-100 text-teal-800', OWNER: 'bg-blue-100 text-blue-800', ADMIN: 'bg-purple-100 text-purple-800' };
const STATUS = { Confirmed: 'bg-teal-100 text-teal-800', Completed: 'bg-slate-200 text-slate-700', Cancelled: 'bg-rose-100 text-rose-700' };

const userRow = (u) => ({
  'User ID': u.id, Name: u.name, Email: u.email, Phone: u.phone || '',
  Role: u.role, Status: u.enabled ? 'Active' : 'Disabled', Joined: u.joined
});

/** Admin section: search any account (customer, owner, admin), view full details, export. */
export default function UserSearchPanel({ showToast }) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('ALL');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return searchAdminUsers({ q, role })
      .then(setUsers)
      .catch((e) => showToast(e.message))
      .finally(() => setLoading(false));
  }, [q, role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce typing
    return () => clearTimeout(t);
  }, [load]);

  const openDetail = async (u) => {
    try { setDetail(await getAdminUser(u.id)); } catch (e) { showToast(e.message); }
  };

  const toggle = async (u) => {
    try {
      await toggleAdminUser(u.id);
      showToast(`${u.name} ${u.enabled ? 'disabled' : 'enabled'}`);
      await load();
      if (detail && detail.user.id === u.id) setDetail(await getAdminUser(u.id));
    } catch (e) { showToast(e.message); }
  };

  const doCsv = () => exportCsv(users.map(userRow), 'users') ? showToast('Users exported to CSV') : showToast('Nothing to export');
  const doXlsx = () => exportXlsx({ Users: users.map(userRow) }, 'users') ? showToast('Users exported to Excel') : showToast('Nothing to export');

  const d = detail;
  const isOwner = d?.user.role === 'OWNER';

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 max-w-3xl">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex-1">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, phone or user ID..." className="w-full bg-transparent text-xs font-medium focus:outline-none" />
            {q && <button onClick={() => setQ('')}><X className="w-4 h-4 text-slate-400" /></button>}
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1">
            {ROLES.map(r => (
              <button key={r.id} onClick={() => setRole(r.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${role === r.id ? 'bg-purple-600 text-white shadow' : 'text-slate-600'}`}>{r.label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-500 font-semibold">{loading ? 'Searching...' : `${users.length} result${users.length === 1 ? '' : 's'}`}</span>
          <ExportButtons onCsv={doCsv} onExcel={doXlsx} disabled={users.length === 0} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
              <th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Phone</th><th className="pb-3">Role</th>
              <th className="pb-3">Status</th><th className="pb-3">Joined</th><th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && <tr><td colSpan="7" className="py-6 text-center text-slate-400 font-semibold">No accounts match your search.</td></tr>}
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-3 font-bold text-slate-900">{u.name} <span className="text-[10px] font-normal text-slate-400">#{u.id}</span></td>
                <td className="py-3 text-slate-600">{u.email}</td>
                <td className="py-3 text-slate-600">{u.phone || '—'}</td>
                <td className="py-3"><span className={`px-2 py-0.5 rounded font-bold text-[10px] ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                <td className="py-3"><span className={`px-2 py-0.5 rounded font-bold text-[10px] ${u.enabled ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-700'}`}>{u.enabled ? 'Active' : 'Disabled'}</span></td>
                <td className="py-3 text-slate-500">{u.joined}</td>
                <td className="py-3 text-right space-x-2">
                  <button onClick={() => openDetail(u)} className="bg-slate-900 hover:bg-purple-600 text-white font-bold px-3 py-1.5 rounded-lg transition">Details</button>
                  <button onClick={() => toggle(u)} className="border border-slate-200 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50">{u.enabled ? 'Disable' : 'Enable'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {d && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl max-w-3xl w-full shadow-2xl space-y-4 border border-slate-200 text-xs">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">{d.user.name} <span className={`ml-2 px-2 py-0.5 rounded font-bold text-[10px] ${ROLE_BADGE[d.user.role]}`}>{d.user.role}</span></h3>
                <p className="text-slate-500">{d.user.email} • {d.user.phone || 'No phone'} • ID #{d.user.id} • Joined {d.user.joined} • {d.user.enabled ? 'Active' : 'Disabled'}</p>
              </div>
              <button onClick={() => setDetail(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {d.user.role !== 'ADMIN' && (
              <div className="grid grid-cols-3 gap-3">
                {isOwner && <Box label="Listings" value={d.propertiesCount} />}
                <Box label={isOwner ? 'Bookings received' : 'Bookings'} value={d.bookingsCount} />
                <Box label={isOwner ? 'Net earnings' : 'Total spent'} value={`₹${d.totalAmount.toLocaleString()}`} valueClass="text-teal-700" />
              </div>
            )}

            {isOwner && d.kyc && (
              <div className="p-3 border border-slate-200 rounded-xl bg-slate-50">
                <h4 className="font-bold uppercase text-slate-500 mb-1">KYC</h4>
                {d.kyc.status === 'NOT_SUBMITTED'
                  ? <p className="text-amber-700 font-semibold">KYC not submitted yet.</p>
                  : <p><b>{d.kyc.status.replace('_', ' ')}</b> • {d.kyc.source === 'CKYC' ? 'CKYC match' : 'Manual entry'} • {d.kyc.idType.replace('_', ' ')} {d.kyc.idMasked} • {d.kyc.fullName}{d.kyc.ckycNumber ? ` • CKYC ${d.kyc.ckycNumber}` : ''}</p>}
              </div>
            )}

            {isOwner && (
              <div>
                <h4 className="font-bold uppercase text-slate-500 mb-2">Listings</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {d.properties.map(p => (
                    <div key={p.id} className="p-2.5 border border-slate-200 rounded-xl flex justify-between">
                      <span><b>{p.name}</b> • {p.type} • {p.location}</span>
                      <span className="font-bold">₹{p.price.toLocaleString()} <span className="text-[10px] text-slate-400">({p.status})</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {d.user.role !== 'ADMIN' && (
              <div>
                <h4 className="font-bold uppercase text-slate-500 mb-2">{isOwner ? 'Bookings on their properties' : 'Booking history'}</h4>
                {d.bookings.length === 0 && <p className="text-slate-400">No bookings.</p>}
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {d.bookings.map(b => (
                    <div key={b.dbId} className="p-2.5 border border-slate-200 rounded-xl flex justify-between items-center">
                      <span>
                        <b>{b.propertyName}</b> <span className="font-mono text-[10px] text-slate-400">{b.id}</span>
                        <span className="block text-slate-500">{isOwner ? `${b.customerName} • ` : ''}{b.checkIn} → {b.checkOut}</span>
                      </span>
                      <span className="text-right"><b className="text-teal-700 block">₹{b.amount.toLocaleString()}</b><span className={`px-2 py-0.5 rounded font-bold text-[10px] ${STATUS[b.status] || ''}`}>{b.status}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => toggle(d.user)} className="border border-slate-200 font-bold px-4 py-2 rounded-lg hover:bg-slate-50">{d.user.enabled ? 'Disable account' : 'Enable account'}</button>
              <button onClick={() => setDetail(null)} className="bg-slate-900 text-white font-bold px-4 py-2 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Box({ label, value, valueClass = 'text-slate-900' }) {
  return (
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
      <span className="block text-[10px] uppercase font-bold text-slate-400">{label}</span>
      <b className={`text-lg ${valueClass}`}>{value}</b>
    </div>
  );
}
