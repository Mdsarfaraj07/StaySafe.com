import React from 'react';
import { ShieldCheck, Bell, LogOut } from 'lucide-react';
import NotificationCenterDrawer from './NotificationCenterDrawer.jsx';
import Avatar from './Avatar.jsx';

const STYLE = {
  customer: { avatar: 'bg-teal-500 text-slate-900', labelColor: 'text-teal-400', label: 'Customer', view: 'customer-dashboard' },
  owner: { avatar: 'bg-blue-500 text-white', labelColor: 'text-blue-400', label: 'Room Owner', view: 'owner-dashboard' },
  admin: { avatar: 'bg-purple-500 text-white', labelColor: 'text-purple-400', label: 'Administrator', view: 'admin-dashboard' }
};

export default function Header({
  user, activeRole, currentView, setCurrentView, onGoHome, onSignIn, onLogout,
  isNotifOpen, setIsNotifOpen, roleNotifications, unreadCount,
  onMarkRead, onMarkAllRead, notifFilter, setNotifFilter, onOpenNotification
}) {
  const navBtn = (view) => `hover:text-white transition ${currentView === view ? 'text-teal-400 font-bold' : ''}`;
  const style = STYLE[activeRole];
  const initials = user ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div onClick={onGoHome} className="flex items-center space-x-3 cursor-pointer group">
            <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-wide text-white">StaySafe</span>
              <span className="block text-[9px] text-teal-400 font-medium tracking-wider uppercase">Safe Stays. Better Tomorrows.</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-300">
            <button onClick={onGoHome} className={navBtn('homepage')}>Home</button>
            <button onClick={() => setCurrentView('search')} className={navBtn('search')}>Properties</button>
            {style && <button onClick={() => setCurrentView(style.view)} className={navBtn(style.view)}>
              {activeRole === 'customer' ? 'Customer Portal' : activeRole === 'owner' ? 'Owner Console' : 'Admin Hub'}
            </button>}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition relative" title="Notification Center">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900 animate-pulse">{unreadCount}</span>
              )}
            </button>
            {isNotifOpen && (
              <NotificationCenterDrawer
                roleNotifications={roleNotifications} unreadCount={unreadCount}
                onClose={() => setIsNotifOpen(false)} onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead} onOpen={onOpenNotification}
                notifFilter={notifFilter} setNotifFilter={setNotifFilter} activeRole={activeRole}
              />
            )}
          </div>

          {user && style && (
            <>
              <div onClick={() => setCurrentView(style.view)} className="flex items-center space-x-2.5 cursor-pointer bg-slate-800 hover:bg-slate-700 py-1.5 px-3 rounded-xl border border-slate-700 transition">
                <Avatar user={user} className="w-7 h-7 rounded-full text-xs" fallbackClass={style.avatar} />
                <div className="text-left hidden sm:block">
                  <span className="block text-xs font-bold text-white">{user.name}</span>
                  <span className={`block text-[10px] font-medium ${style.labelColor}`}>{style.label}</span>
                </div>
              </div>
              <button onClick={onLogout} title="Sign out" className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 transition">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}

          {!user && (
            <button onClick={onSignIn} className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow">Sign In</button>
          )}
        </div>
      </div>
    </header>
  );
}
