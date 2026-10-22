import { assetUrl } from '../../api/client';
import React, { useState, useEffect } from 'react';
import AvatarUploader from '../../components/AvatarUploader';
import TenantProfileForm from '../../components/TenantProfileForm';
import { Bell, Search, Calendar, Download, BookmarkCheck, Heart, Headphones, User, Users } from 'lucide-react';
import { getProperty, cancelBooking, getMyTickets, createTicket, updateProfile } from '../../api/services';

const STATUS_STYLE = {
  Confirmed: 'bg-teal-100 text-teal-800',
  Completed: 'bg-slate-200 text-slate-700',
  Cancelled: 'bg-rose-100 text-rose-700'
};

export default function CustomerDashboardView({ user, userBookings, properties, favorites, onToggleFavorite, onExploreClick, onViewProperty, onBookingsChanged, onProfileUpdated, showToast, unreadCount, onOpenNotif, focusTicketId, onFocusHandled }) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [tickets, setTickets] = useState([]);
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' });

  const [highlightId, setHighlightId] = useState(null);
  const [ticketQuery, setTicketQuery] = useState('');
  const loadTickets = () => getMyTickets().then(setTickets).catch(() => {});
  useEffect(() => { loadTickets(); }, []);

  // Opened from a notification: switch to Support, load tickets of this account and highlight the one clicked
  useEffect(() => {
    if (!focusTicketId) return;
    setActiveTab('tickets');
    setTicketQuery('');
    getMyTickets().then((list) => {
      setTickets(list);
      if (list.some(t => t.dbId === focusTicketId)) setHighlightId(focusTicketId);
      else showToast('That ticket was not found in your account');
    }).catch(() => {});
    onFocusHandled?.();
  }, [focusTicketId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!highlightId) return undefined;
    const scroll = setTimeout(() => document.getElementById(`ticket-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    const clear = setTimeout(() => setHighlightId(null), 6000);
    return () => { clearTimeout(scroll); clearTimeout(clear); };
  }, [highlightId, tickets, activeTab]);

  const visibleTickets = tickets.filter(t => {
    const q = ticketQuery.trim().toLowerCase();
    return !q || t.id.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
  });

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject.trim()) return;
    try {
      await createTicket(ticketSubject, ticketMsg);
      setTicketSubject('');
      setTicketMsg('');
      loadTickets();
      showToast('Support ticket submitted to StaySafe team!');
    } catch (err) { showToast(err.message); }
  };

  const handleCancel = async (bk) => {
    if (!window.confirm(`Cancel booking ${bk.id}?`)) return;
    try {
      await cancelBooking(bk.dbId);
      onBookingsChanged();
      showToast('Booking cancelled. Refund in 3-5 business days.');
    } catch (err) { showToast(err.message); }
  };

  const handleView = async (bk) => {
    const prop = properties.find(p => p.id === bk.propertyId) || await getProperty(bk.propertyId).catch(() => null);
    if (prop) onViewProperty(prop); else showToast('This property is no longer available');
  };

  const downloadReceipt = (bk) => {
    const text = `StaySafe Booking Receipt\n\nBooking: ${bk.id}\nProperty: ${bk.propertyName}\nLocation: ${bk.location}\nStay: ${bk.checkIn} to ${bk.checkOut}\nGuests: ${bk.guests}\nAmount: INR ${bk.amount}\nPayment: ${bk.paymentMethod} (${bk.paymentRef})\nStatus: ${bk.status}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${bk.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Receipt downloaded for ${bk.id}`);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      onProfileUpdated(await updateProfile(profile));
      showToast('Profile updated');
    } catch (err) { showToast(err.message); }
  };

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const openTickets = tickets.filter(t => t.status === 'Open').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-4">
          <AvatarUploader user={user} onUpdated={onProfileUpdated} showToast={showToast} fallbackClass="bg-gradient-to-tr from-teal-400 to-blue-500 text-slate-900" />
          <div>
            <span className="inline-block bg-teal-500/20 text-teal-300 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-md mb-1 border border-teal-500/30">Verified Resident</span>
            <h1 className="text-2xl font-black text-white">Hello, {user.name}</h1>
            <p className="text-slate-400 text-xs">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={onOpenNotif} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition flex items-center space-x-2">
            <Bell className="w-4 h-4 text-teal-400" /><span>Updates</span>
            {unreadCount > 0 && <span className="bg-teal-500 text-slate-950 font-black text-[10px] px-1.5 rounded-full">{unreadCount}</span>}
          </button>
          <button onClick={onExploreClick} className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md flex items-center space-x-2">
            <Search className="w-4 h-4" /><span>Browse Stays</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Upcoming Stays" value={userBookings.filter(b => b.status === 'Confirmed').length} />
        <StatCard label="Completed Stays" value={userBookings.filter(b => b.status === 'Completed').length} />
        <StatCard label="Saved Favorites" value={favorites.length} valueClass="text-rose-500" />
        <StatCard label="Open Tickets" value={openTickets} valueClass="text-teal-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 h-fit space-y-1">
          {[
            { id: 'bookings', label: 'My Bookings', icon: BookmarkCheck },
            { id: 'favorites', label: 'Favorites', icon: Heart },
            { id: 'roommate', label: 'Roommate Profile', icon: Users },
            { id: 'tickets', label: 'Support & Help', icon: Headphones },
            { id: 'profile', label: 'Profile Settings', icon: User }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-xs transition ${activeTab === tab.id ? 'bg-teal-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4" /><span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'bookings' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Your Reserved Accommodation Bookings</h2>
              {userBookings.length === 0 ? (
                <p className="text-xs text-slate-500">No bookings yet.</p>
              ) : userBookings.map((bk) => (
                <div key={bk.dbId} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <img src={assetUrl(bk.image)} alt={bk.propertyName} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_STYLE[bk.status] || ''}`}>{bk.status}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{bk.id}</span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 mt-1">{bk.propertyName}</h4>
                      <p className="text-xs text-slate-500">{bk.location}</p>
                      {bk.roomLabel && <p className="text-xs font-semibold text-teal-700">{bk.roomLabel}</p>}
                      <p className="text-xs font-semibold text-slate-700 mt-1 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-teal-600" /><span>{bk.checkIn} to {bk.checkOut}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                    <span className="text-lg font-black text-teal-700">₹{bk.amount.toLocaleString()}</span>
                    <div className="flex space-x-2">
                      <button onClick={() => downloadReceipt(bk)} title="Download receipt" className="bg-white border border-slate-200 text-slate-700 hover:text-teal-600 p-2 rounded-lg"><Download className="w-4 h-4" /></button>
                      {bk.status === 'Confirmed' && (
                        <button onClick={() => handleCancel(bk)} className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2 rounded-lg">Cancel</button>
                      )}
                      <button onClick={() => handleView(bk)} className="bg-slate-900 text-white hover:bg-teal-600 text-xs font-bold px-3 py-2 rounded-lg transition">View Stay</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Saved Favorite Stays</h2>
              {favorites.length === 0 && <p className="text-xs text-slate-500">You haven't saved any stays yet.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {properties.filter(p => favorites.includes(p.id)).map(prop => (
                  <div key={prop.id} className="p-3 border rounded-xl bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewProperty(prop)}>
                      <img src={assetUrl(prop.image)} alt={prop.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{prop.name}</h4>
                        <span className="text-[10px] text-teal-700 font-bold">₹{prop.price.toLocaleString()}/mo</span>
                      </div>
                    </div>
                    <button onClick={() => onToggleFavorite(prop.id)} className="text-rose-500 hover:underline text-xs font-bold">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Tenant Safety & Support Portal</h2>
              <form onSubmit={handleCreateTicket} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-xs uppercase text-slate-500">Raise Support Ticket</h3>
                <input type="text" placeholder="Issue subject (e.g. WiFi issue, Maintenance requirement)" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none" required />
                <textarea placeholder="Describe your query..." value={ticketMsg} onChange={(e) => setTicketMsg(e.target.value)} className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none h-20"></textarea>
                <button type="submit" className="bg-teal-600 text-white font-bold text-xs px-4 py-2 rounded-lg shadow hover:bg-teal-700 transition">Submit Ticket</button>
              </form>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-xs uppercase text-slate-400">Your Tickets</h3>
                  <input value={ticketQuery} onChange={(e) => setTicketQuery(e.target.value)} placeholder="Find by ticket ID or subject..."
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 w-56" />
                </div>
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2">Tickets linked to your registered email: <b>{user.email}</b></p>
                {tickets.length === 0 ? <p className="text-xs text-slate-400">No support tickets yet.</p>
                  : visibleTickets.length === 0 ? <p className="text-xs text-slate-400">No ticket matches your search.</p>
                  : visibleTickets.map(t => (
                  <div key={t.dbId} id={`ticket-${t.dbId}`} className={`p-3 rounded-lg border text-xs space-y-1 transition ${highlightId === t.dbId ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-300' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <div><span className="font-mono text-[10px] text-slate-400 block">{t.id} • {t.date}</span><span className="font-bold text-slate-800">{t.subject}</span></div>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${t.status === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'}`}>{t.status}</span>
                    </div>
                    {t.response && <p className="text-slate-600 bg-white border border-slate-200 rounded p-2"><b>StaySafe team:</b> {t.response}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'roommate' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Roommate profile</h2>
                <p className="text-xs text-slate-500">Required to book a bed. Used to check house rules (gender, food, students / professionals) and to show how well you match your future roommates.</p>
              </div>
              <TenantProfileForm showToast={showToast} />
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={saveProfile} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 text-xs">
              <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
              <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <AvatarUploader user={user} onUpdated={onProfileUpdated} showToast={showToast} fallbackClass="bg-gradient-to-tr from-teal-400 to-blue-500 text-slate-900" className="w-20 h-20 rounded-2xl text-3xl" />
                <div><b className="text-slate-800">Profile photo</b><p className="text-slate-500 mt-0.5">Click the photo to upload a new one (JPG, PNG or WebP). Hover and press × to remove it.</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase text-slate-400 mb-1">Full Name</label>
                  <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-medium" />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-400 mb-1">Phone</label>
                  <input type="text" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-medium" />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold uppercase text-slate-400 mb-1">Email</label>
                  <input type="email" value={user.email} disabled className="w-full p-2.5 bg-slate-100 rounded-lg border border-slate-200 font-medium text-slate-500" />
                </div>
              </div>
              <button className="bg-teal-600 text-white font-bold px-4 py-2 rounded-lg">Save Changes</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, valueClass = 'text-slate-900' }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
      <span className={`text-3xl font-black block mt-1 ${valueClass}`}>{value}</span>
    </div>
  );
}
