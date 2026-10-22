import React, { useState, useEffect, useCallback } from 'react';
import { Bell, ShieldAlert, CheckCircle } from 'lucide-react';
import UserSearchPanel from '../../components/UserSearchPanel';
import KycReviewPanel from '../../components/KycReviewPanel';
import SharingBadges from '../../components/SharingBadges';
import PaymentsPanel from '../../components/PaymentsPanel';
import AdminLiveChatPanel from '../../components/AdminLiveChatPanel';
import AdminPropertyDocumentsPanel from '../../components/AdminPropertyDocumentsPanel';
import AvatarUploader from '../../components/AvatarUploader';
import {
  getAdminStats, getPendingProperties, approveProperty, rejectProperty,
  getAdminTickets, updateAdminTicket
} from '../../api/services';

export default function AdminDashboardView({ showToast, unreadCount, onOpenNotif, onPropertiesChanged, focusTicketId, onFocusHandled, user, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState('queue');
  const [stats, setStats] = useState({ totalUsers: 0, totalStays: 0, totalBookings: 0, platformRevenue: 0 });
  const [pending, setPending] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState({});

  const refresh = useCallback(() => {
    getAdminStats().then(setStats).catch(() => {});
    getPendingProperties().then(setPending).catch(() => {});
    getAdminTickets().then(setTickets).catch(() => {});
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const [highlightId, setHighlightId] = useState(null);
  // Opened from a ticket notification: switch to the ticket desk and highlight that ticket
  useEffect(() => {
    if (!focusTicketId) return;
    setActiveTab('tickets');
    setHighlightId(focusTicketId);
    refresh();
    onFocusHandled?.();
  }, [focusTicketId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!highlightId) return undefined;
    const scroll = setTimeout(() => document.getElementById(`ticket-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    const clear = setTimeout(() => setHighlightId(null), 6000);
    return () => { clearTimeout(scroll); clearTimeout(clear); };
  }, [highlightId, tickets, activeTab]);

  const act = async (fn, okMsg) => {
    try { await fn(); setSelected(null); refresh(); onPropertiesChanged(); showToast(okMsg); }
    catch (e) { showToast(e.message); }
  };

  const respond = async (t, status) => {
    try {
      await updateAdminTicket(t.dbId, { response: replies[t.dbId] || '', status });
      setReplies({ ...replies, [t.dbId]: '' });
      refresh();
      showToast(`Ticket ${t.id} updated`);
    } catch (e) { showToast(e.message); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between border border-slate-800">
        <div className="flex items-center space-x-4">
          <AvatarUploader user={user} onUpdated={onUserUpdated} showToast={showToast} fallbackClass="bg-gradient-to-tr from-purple-600 to-indigo-600 text-white" />
          <div>
            <span className="inline-block bg-purple-500/20 text-purple-300 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-md mb-1 border border-purple-500/30">System Oversight</span>
            <h1 className="text-2xl font-black text-white">System Administrator</h1>
            <p className="text-slate-400 text-xs">StaySafe Control Hub & Verification Queue</p>
          </div>
        </div>
        <button onClick={onOpenNotif} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition flex items-center space-x-2">
          <Bell className="w-4 h-4 text-purple-400" /><span>System Audits</span>
          {unreadCount > 0 && <span className="bg-purple-500 text-white font-black text-[10px] px-1.5 rounded-full">{unreadCount}</span>}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Users" value={stats.totalUsers} />
        <Stat label="Total Stays" value={stats.totalStays} />
        <Stat label="Total Bookings" value={stats.totalBookings} />
        <Stat label="Platform Revenue (10%)" value={`₹${Number(stats.platformRevenue).toLocaleString()}`} valueClass="text-teal-700" />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex space-x-3 border-b border-slate-100 pb-4">
          {[{ id: 'queue', label: `Verification Queue (${pending.length})` }, { id: 'kyc', label: 'KYC Review' }, { id: 'payments', label: 'Payments' }, { id: 'tickets', label: `Support Tickets (${tickets.filter(t => t.status === 'Open').length})` }, { id: 'documents', label: 'Property Documents' }, { id: 'chat', label: 'Live Chat' }, { id: 'users', label: 'Users & Search' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === t.id ? 'bg-purple-600 text-white shadow' : 'bg-slate-100 text-slate-600'}`}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'queue' && (
          <>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2"><ShieldAlert className="w-5 h-5 text-amber-500" /><span>Property Verification Queue</span></h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead><tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]"><th className="pb-3">Property</th><th className="pb-3">Owner</th><th className="pb-3">Rent</th><th className="pb-3">Status</th><th className="pb-3 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.length === 0 ? (
                    <tr><td colSpan="5" className="py-6 text-center text-slate-400 font-semibold">No pending properties in verification queue.</td></tr>
                  ) : pending.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 text-slate-600">{p.owner}</td>
                      <td className="py-3 font-bold text-teal-700">₹{p.price.toLocaleString()}</td>
                      <td className="py-3"><span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">Under Review</span></td>
                      <td className="py-3 text-right"><button onClick={() => setSelected(p)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-lg transition">Review Verification</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-3 text-xs">
            {tickets.length === 0 && <p className="text-slate-400">No tickets.</p>}
            {tickets.map(t => (
              <div key={t.dbId} id={`ticket-${t.dbId}`} className={`p-4 border rounded-xl space-y-2 transition ${highlightId === t.dbId ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400">{t.id} • {t.customerName} ({t.customerEmail}) • {t.date}</span>
                    <h4 className="font-bold text-slate-900">{t.subject}</h4>
                    {t.message && <p className="text-slate-600 mt-1">{t.message}</p>}
                  </div>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${t.status === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'}`}>{t.status}</span>
                </div>
                {t.response && <p className="bg-white border border-slate-200 rounded p-2"><b>Response:</b> {t.response}</p>}
                <div className="flex space-x-2">
                  <input value={replies[t.dbId] || ''} onChange={(e) => setReplies({ ...replies, [t.dbId]: e.target.value })} placeholder="Write a response..." className="flex-1 p-2 rounded-lg border border-slate-200 focus:outline-none" />
                  <button onClick={() => respond(t, 'Open')} className="bg-white border border-slate-200 font-bold px-3 rounded-lg">Reply</button>
                  <button onClick={() => respond(t, 'Resolved')} className="bg-teal-600 text-white font-bold px-3 rounded-lg">Resolve</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'documents' && <AdminPropertyDocumentsPanel showToast={showToast} />}
        {activeTab === 'chat' && <AdminLiveChatPanel showToast={showToast} />}
        {activeTab === 'users' && <UserSearchPanel showToast={showToast} />}
        {activeTab === 'kyc' && <KycReviewPanel showToast={showToast} onChanged={onPropertiesChanged} />}
        {activeTab === 'payments' && <PaymentsPanel showToast={showToast} onChanged={onPropertiesChanged} />}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-900 text-base">Review Stay Verification Documents</h3>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200">
              <span className="font-bold block text-slate-900">{selected.name}</span>
              <span className="text-slate-500 block">Owner: {selected.owner}</span>
              <span className="text-teal-700 font-bold">Location: {selected.location}</span>
              <div className="pt-2"><SharingBadges property={selected} size="lg" /></div>
            </div>
            <div className="space-y-2">
              <span className="font-bold text-slate-700 uppercase text-[10px] block">Required evidence:</span>
              <p className="text-slate-600">Review the actual uploaded electricity bill and ownership/rental authorization in the Property Documents tab. Approval is blocked until required documents are approved.</p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button onClick={() => setSelected(null)} className="w-full bg-slate-100 font-bold py-2.5 rounded-lg">Close</button>
              <button onClick={() => act(() => rejectProperty(selected.id), 'Property Listing Rejected & Returned to Host')} className="w-full bg-rose-50 text-rose-700 font-bold py-2.5 rounded-lg border border-rose-200">Reject</button>
              <button onClick={() => act(() => approveProperty(selected.id), 'Property Verified & Published Live on StaySafe!')} className="w-full bg-teal-600 text-white font-bold py-2.5 rounded-lg shadow hover:bg-teal-700">Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, valueClass = 'text-slate-900' }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
      <span className={`text-3xl font-black block mt-1 ${valueClass}`}>{value}</span>
    </div>
  );
}
