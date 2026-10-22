import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Bell, Ticket, BookmarkCheck, CreditCard, MessageSquare, ShieldAlert, DollarSign, Lock
} from 'lucide-react';

import { GUEST_NOTIFICATIONS } from './data/guestNotifications.js';
import { getStoredUser, setSession, clearSession, getToken } from './api/client.js';
import * as svc from './api/services.js';

import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import ChatbotWidget from './components/ChatbotWidget.jsx';
import LiveSupportChat from './components/LiveSupportChat.jsx';
import WhatsAppSupportButton from './components/WhatsAppSupportButton.jsx';

import AuthView from './pages/AuthView.jsx';
import HomepageView from './pages/HomepageView.jsx';
import PropertyListingView from './pages/PropertyListingView.jsx';
import PropertyDetailView from './pages/PropertyDetailView.jsx';
import BookingPaymentView from './pages/BookingPaymentView.jsx';
import CustomerDashboardView from './pages/dashboards/CustomerDashboardView.jsx';
import OwnerDashboardView from './pages/dashboards/OwnerDashboardView.jsx';
import AdminDashboardView from './pages/dashboards/AdminDashboardView.jsx';

const ICONS = {
  system: Sparkles, promo: Ticket, booking: BookmarkCheck, payment: CreditCard,
  support: MessageSquare, audit: ShieldAlert, payout: DollarSign, security: Lock
};

const DASHBOARD_ROLE = { 'customer-dashboard': 'customer', 'owner-dashboard': 'owner', 'admin-dashboard': 'admin' };
const DASHBOARD_FOR = { customer: 'customer-dashboard', owner: 'owner-dashboard', admin: 'admin-dashboard' };

const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function App() {
  const [currentView, setCurrentView] = useState('homepage');
  const [pendingView, setPendingView] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [bookingDraft, setBookingDraft] = useState(null);

  const [user, setUser] = useState(getStoredUser());
  const activeRole = user ? user.role.toLowerCase() : 'guest';

  const [properties, setProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [userBookings, setUserBookings] = useState([]);

  const [notifications, setNotifications] = useState(GUEST_NOTIFICATIONS);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [focusTicket, setFocusTicket] = useState(null);   // ticket id to open after a notification click

  const [searchQuery, setSearchQuery] = useState('Bangalore');
  const [checkInDate, setCheckInDate] = useState(addDays(7));
  const [checkOutDate, setCheckOutDate] = useState(addDays(37));
  const [guestCount, setGuestCount] = useState('1 Guest');

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ---------- data loaders ----------
  const loadProperties = useCallback(() => {
    svc.getProperties().then(setProperties).catch(() => showToast('Could not reach the server. Is the backend running?'));
  }, [showToast]);

  const loadNotifications = useCallback(() => {
    svc.getNotifications().then(setNotifications).catch(() => {});
  }, []);

  const loadBookings = useCallback(() => {
    svc.getMyBookings().then(setUserBookings).catch(() => {});
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setFavorites([]);
    setUserBookings([]);
    setNotifications(GUEST_NOTIFICATIONS);
    setIsNotifOpen(false);
    setCurrentView('homepage');
  }, []);

  // Show a safe status message after the DigiLocker OAuth callback redirects back.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('kyc');
    if (result === 'digilocker-pending') {
      showToast('DigiLocker connected. Your KYC is pending document review.');
    } else if (result === 'digilocker-error') {
      showToast('DigiLocker verification could not be completed. Please try again.');
    }
    if (result) {
      params.delete('kyc');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    }
  }, [showToast]);

  // initial load + validate stored session
  useEffect(() => {
    loadProperties();
    if (getToken()) {
      svc.getMe().then((u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); }).catch(() => logout());
    }
    const onExpired = () => { logout(); showToast('Session expired. Please sign in again.'); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // per-user data + notification polling
  useEffect(() => {
    if (!user) return undefined;
    loadNotifications();
    if (user.role === 'CUSTOMER') {
      loadBookings();
      svc.getFavorites().then(setFavorites).catch(() => {});
    }
    const t = setInterval(loadNotifications, 30000);
    return () => clearInterval(t);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- auth ----------
  const handleAuth = ({ token, user: u }) => {
    setSession(token, u);
    setUser(u);
    showToast(`Welcome, ${u.name}!`);
    if (pendingView && u.role === 'CUSTOMER') {
      setCurrentView(pendingView);
    } else {
      setCurrentView(DASHBOARD_FOR[u.role.toLowerCase()]);
    }
    setPendingView(null);
  };

  const goLogin = (next = null) => {
    setPendingView(next);
    setCurrentView('login');
  };

  // ---------- actions ----------
  const handleToggleFavorite = (id) => {
    if (!user) { showToast('Please sign in to save favorites'); goLogin(); return; }
    if (user.role !== 'CUSTOMER') { showToast('Only customers can save favorites'); return; }
    svc.toggleFavorite(id)
      .then((res) => { setFavorites(res.ids); showToast(res.favorited ? 'Added to favorites!' : 'Removed from favorites'); })
      .catch((e) => showToast(e.message));
  };

  const openProperty = (prop) => {
    setSelectedProperty(prop);
    setCurrentView('detail');
  };

  const proceedToBooking = (draft) => {
    setBookingDraft(draft);
    if (!user) { showToast('Please sign in to book this stay'); goLogin('booking'); return; }
    if (user.role !== 'CUSTOMER') { showToast('Please sign in as a Customer to book a stay'); return; }
    setCurrentView('booking');
  };

  const handleBookingDone = () => {
    loadBookings();
    loadNotifications();
    loadProperties();
    showToast('Booking Confirmed & Notification Sent!');
    setCurrentView('customer-dashboard');
  };

  const markNotificationRead = (id) => {
    setNotifications(notifications.map(n => (n.id === id ? { ...n, unread: false } : n)));
    if (user) svc.markNotificationRead(id).catch(() => {});
  };

  const markAllNotificationsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
    if (user) svc.markAllNotificationsRead().catch(() => {});
    showToast('All notifications marked as read');
  };

  const updateUser = (u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); };

  // Clicking a ticket notification opens that ticket in the user's own account (registered email)
  const openNotification = (n) => {
    if (!user) return;
    setIsNotifOpen(false);
    if (n.refType === 'ticket') {
      setFocusTicket(n.refId);
      setCurrentView(user.role === 'ADMIN' ? 'admin-dashboard' : `${user.role.toLowerCase()}-dashboard`);
      return;
    }
    if (n.refType === 'chat') {
      if (user.role === 'ADMIN') {
        setCurrentView('admin-dashboard');
        window.setTimeout(() => window.dispatchEvent(new CustomEvent('staysafe:open-admin-chat', { detail: { userId: n.refId } })), 150);
      } else {
        window.dispatchEvent(new Event('staysafe:open-support-chat'));
      }
      return;
    }
    if (n.refType === 'property-document' || n.type === 'audit' || n.type === 'system') {
      setCurrentView(user.role === 'ADMIN' ? 'admin-dashboard' : user.role === 'OWNER' ? 'owner-dashboard' : 'customer-dashboard');
      showToast(n.title || 'Notification update');
      return;
    }
    if (n.type === 'booking' || n.type === 'payment' || n.type === 'support') {
      setCurrentView(user.role === 'OWNER' ? 'owner-dashboard' : user.role === 'ADMIN' ? 'admin-dashboard' : 'customer-dashboard');
      showToast(n.title || 'Notification update');
    }
  };

  const roleNotifications = notifications.map(n => ({ ...n, icon: ICONS[n.type] || Bell }));
  const unreadCount = roleNotifications.filter(n => n.unread).length;

  // route guard
  let view = currentView;
  if (DASHBOARD_ROLE[view] && DASHBOARD_ROLE[view] !== activeRole) view = 'login';
  if (view === 'booking' && activeRole !== 'customer') view = 'login';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-teal-500 selection:text-white flex flex-col justify-between relative">
      <div>
        <Header
          user={user}
          activeRole={activeRole}
          currentView={view}
          setCurrentView={setCurrentView}
          onGoHome={() => setCurrentView('homepage')}
          onSignIn={() => goLogin()}
          onLogout={logout}
          isNotifOpen={isNotifOpen}
          setIsNotifOpen={setIsNotifOpen}
          roleNotifications={roleNotifications}
          unreadCount={unreadCount}
          onMarkRead={markNotificationRead}
          onMarkAllRead={markAllNotificationsRead}
          onOpenNotification={openNotification}
          notifFilter={notifFilter}
          setNotifFilter={setNotifFilter}
        />

        {toast && (
          <div className="fixed top-24 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-teal-500/50">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <span className="text-sm font-medium">{toast}</span>
          </div>
        )}

        <main className="transition-all duration-300 pb-12">
          {view === 'login' && <AuthView onAuth={handleAuth} showToast={showToast} />}

          {view === 'homepage' && (
            <HomepageView
              onSearch={() => setCurrentView('search')}
              onSelectProperty={openProperty}
              properties={properties}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              checkInDate={checkInDate} setCheckInDate={setCheckInDate}
              checkOutDate={checkOutDate} setCheckOutDate={setCheckOutDate}
              guestCount={guestCount} setGuestCount={setGuestCount}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {view === 'search' && (
            <PropertyListingView
              properties={properties}
              onSelectProperty={openProperty}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {view === 'detail' && selectedProperty && (
            <PropertyDetailView
              property={selectedProperty}
              user={user}
              initialDraft={{ checkIn: checkInDate, checkOut: checkOutDate, guests: guestCount }}
              onBack={() => setCurrentView('search')}
              onProceedToBooking={proceedToBooking}
              onReviewAdded={loadProperties}
              showToast={showToast}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {view === 'booking' && selectedProperty && bookingDraft && (
            <BookingPaymentView
              user={user}
              property={selectedProperty}
              draft={bookingDraft}
              onBack={() => setCurrentView('detail')}
              onDone={handleBookingDone}
            />
          )}

          {view === 'customer-dashboard' && (
            <CustomerDashboardView
              user={user}
              userBookings={userBookings}
              properties={properties}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onExploreClick={() => setCurrentView('search')}
              onViewProperty={openProperty}
              onBookingsChanged={() => { loadBookings(); loadNotifications(); loadProperties(); }}
              onProfileUpdated={updateUser}
              showToast={showToast}
              unreadCount={unreadCount}
              onOpenNotif={() => setIsNotifOpen(true)}
              focusTicketId={focusTicket}
              onFocusHandled={() => setFocusTicket(null)}
            />
          )}

          {view === 'owner-dashboard' && (
            <OwnerDashboardView
              user={user}
              onUserUpdated={updateUser}
              showToast={showToast}
              unreadCount={unreadCount}
              onOpenNotif={() => setIsNotifOpen(true)}
              onChanged={loadNotifications}
            />
          )}

          {view === 'admin-dashboard' && (
            <AdminDashboardView
              user={user}
              onUserUpdated={updateUser}
              showToast={showToast}
              unreadCount={unreadCount}
              onOpenNotif={() => setIsNotifOpen(true)}
              onPropertiesChanged={() => { loadProperties(); loadNotifications(); }}
              focusTicketId={focusTicket}
              onFocusHandled={() => setFocusTicket(null)}
            />
          )}
        </main>
      </div>

      {user && <LiveSupportChat user={user} showToast={showToast} />}
      <WhatsAppSupportButton user={user} />
      <ChatbotWidget />
      <Footer showToast={showToast} />
    </div>
  );
}
