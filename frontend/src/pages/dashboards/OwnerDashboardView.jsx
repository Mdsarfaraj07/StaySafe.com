import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, MapPin, Pencil } from 'lucide-react';
import { assetUrl } from '../../api/client';
import AvatarUploader from '../../components/AvatarUploader';
import CustomerSearchPanel from '../../components/CustomerSearchPanel';
import ResidentsPanel from '../../components/ResidentsPanel';
import KycOnboarding from '../../components/KycOnboarding';
import PropertyFormModal from '../../components/PropertyFormModal';
import { getOwnerProperties, getOwnerBookings, getOwnerStats, getMyKyc } from '../../api/services';

const STATUS_STYLE = { Active: 'bg-teal-100 text-teal-800', 'Under Review': 'bg-amber-100 text-amber-800', Rejected: 'bg-rose-100 text-rose-700' };

export default function OwnerDashboardView({ user, showToast, unreadCount, onOpenNotif, onChanged, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState('properties');
  const [modal, setModal] = useState(null);                 // null | 'new' | property being edited
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ listedProperties: 0, activeBookings: 0, totalEarnings: 0, pendingVerifications: 0 });
  const [kyc, setKyc] = useState(null);

  const refresh = useCallback(() => {
    getOwnerProperties().then(setProperties).catch(() => {});
    getOwnerBookings().then(setBookings).catch(() => {});
    getOwnerStats().then(setStats).catch(() => {});
    getMyKyc().then(setKyc).catch(() => {});
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const kycOk = kyc && (kyc.status === 'VERIFIED' || kyc.status === 'PENDING_REVIEW');
  const openAdd = () => {
    if (!kycOk) { showToast('Complete KYC verification before listing a property'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setModal('new');
  };

  const saved = (p, wasEdit) => {
    setModal(null);
    refresh();
    onChanged();
    showToast(wasEdit
      ? (p.status === 'Under Review' ? 'Saved — sent back to admins for re-verification' : 'Property updated')
      : 'New property submitted to Admin Verification Queue!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-4">
          <AvatarUploader user={user} onUpdated={onUserUpdated} showToast={showToast}
            fallbackClass="bg-gradient-to-tr from-blue-500 to-indigo-600 text-white" />
          <div>
            <span className="inline-block bg-blue-500/20 text-blue-300 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-md mb-1 border border-blue-500/30">Verified Partner Host</span>
            <h1 className="text-2xl font-black text-white">Welcome, {user.name}</h1>
            <p className="text-slate-400 text-xs">Property Owner Console • click your photo to change it</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={onOpenNotif} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition flex items-center space-x-2">
            <Bell className="w-4 h-4 text-blue-400" /><span>Alerts</span>
            {unreadCount > 0 && <span className="bg-blue-500 text-white font-black text-[10px] px-1.5 rounded-full">{unreadCount}</span>}
          </button>
          <button onClick={openAdd} className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md flex items-center space-x-2">
            <Plus className="w-4 h-4" /><span>Add New Property</span>
          </button>
        </div>
      </div>

      {kyc && (kyc.status === 'NOT_SUBMITTED' || kyc.status === 'REJECTED') && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-amber-300 space-y-4 max-w-2xl">
          <div>
            <h2 className="text-lg font-black text-slate-900">Complete your KYC to start listing</h2>
            <p className="text-xs text-slate-500">Verify via the Central KYC registry (CKYC) — or enter your government ID manually if you're not found.</p>
            {kyc.status === 'REJECTED' && (
              <p className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5"><b>Your last submission was rejected:</b> {kyc.remarks}</p>
            )}
          </div>
          <KycOnboarding defaultName={user.name} onSubmitted={() => refresh()} />
        </div>
      )}

      {kyc && kyc.status === 'PENDING_REVIEW' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <b>KYC under review.</b> Your {kyc.idType.replace('_', ' ')} ({kyc.idMasked}) is with our team. You can submit listings now — they go live once KYC is approved.
        </div>
      )}

      {kyc && kyc.status === 'VERIFIED' && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex flex-wrap items-center gap-x-3">
          <b>✓ KYC verified</b>
          <span>{kyc.source === 'CKYC' ? 'via CKYC' : 'manually reviewed'} • {kyc.idType.replace('_', ' ')} {kyc.idMasked}{kyc.ckycNumber ? ` • CKYC No. ${kyc.ckycNumber}` : ''}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Listed Properties" value={stats.listedProperties} />
        <Stat label="Active Bookings" value={stats.activeBookings} />
        <Stat label="Net Earnings (after 10% fee)" value={`₹${Number(stats.totalEarnings).toLocaleString()}`} valueClass="text-teal-700" />
        <Stat label="Pending Verifications" value={stats.pendingVerifications} valueClass="text-amber-500" />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex space-x-3 border-b border-slate-100 pb-4">
          {[{ id: 'properties', label: 'My Properties' }, { id: 'bookings', label: 'Incoming Guests' }, { id: 'residents', label: 'Residents' }, { id: 'customers', label: 'Customers' }, { id: 'payouts', label: 'Payout History' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === t.id ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-600'}`}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'properties' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="pb-3">Property</th><th className="pb-3">Location</th><th className="pb-3">Rent / mo</th><th className="pb-3">Status</th><th className="pb-3 text-right">Bookings</th><th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {properties.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-slate-400 font-semibold">No properties yet. Click "Add New Property".</td></tr>}
                {properties.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3"><div className="flex items-center space-x-3 font-bold text-slate-900"><img src={assetUrl(p.image)} alt={p.name} className="w-10 h-10 rounded-lg object-cover" /><span>{p.name}<span className="block text-[10px] font-normal text-slate-400">{p.images.length} photo{p.images.length === 1 ? '' : 's'}</span></span></div></td>
                    <td className="py-3 text-slate-600"><span className="block">{p.location}</span>
                      {p.latitude != null ? <span className="text-[10px] text-teal-700 flex items-center space-x-0.5"><MapPin className="w-3 h-3" /><span>Pinned</span></span>
                        : <span className="text-[10px] text-amber-700 font-semibold">No map pin — edit to add</span>}</td>
                    <td className="py-3 font-bold text-teal-700">₹{p.price.toLocaleString()}</td>
                    <td className="py-3"><span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${STATUS_STYLE[p.status] || ''}`}>{p.status}</span></td>
                    <td className="py-3 text-right font-bold text-slate-800">{p.bookingsCount} Guests</td>
                    <td className="py-3 text-right"><button onClick={() => setModal(p)} className="inline-flex items-center space-x-1 border border-slate-200 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50"><Pencil className="w-3 h-3" /><span>Edit</span></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-3">
            {bookings.length === 0 && <p className="text-xs text-slate-400">No bookings yet.</p>}
            {bookings.map(b => (
              <div key={b.dbId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{b.customerName} — {b.propertyName}</span>
                  <span className="text-slate-500">{b.checkIn} → {b.checkOut} • {b.roomLabel || b.guests} {b.customerPhone ? `• ${b.customerPhone}` : ''}</span>
                </div>
                <span className={`font-bold px-3 py-1 rounded-lg ${b.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-800'}`}>
                  {b.status === 'Cancelled' ? 'Cancelled' : 'Approved & Paid'}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'residents' && <ResidentsPanel showToast={showToast} />}
        {activeTab === 'customers' && <CustomerSearchPanel showToast={showToast} />}

        {activeTab === 'payouts' && (
          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">Earnings from Razorpay-paid bookings</span>
              <p className="text-slate-500">Platform fee of 10% is deducted from each booking.</p>
            </div>
            {bookings.filter(b => b.status !== 'Cancelled').map(b => (
              <div key={b.dbId} className="p-3 border border-slate-200 rounded-xl flex justify-between">
                <span><b>{b.id}</b> • {b.propertyName} • {b.customerName}</span>
                <span className="font-bold text-teal-700">+ ₹{Math.round(b.amount * 0.9).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <PropertyFormModal
          property={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={saved}
          showToast={showToast}
        />
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
