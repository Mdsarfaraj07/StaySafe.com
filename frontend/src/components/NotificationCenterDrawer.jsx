import React from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';

export default function NotificationCenterDrawer({ roleNotifications, unreadCount, onClose, onMarkRead, onMarkAllRead, notifFilter, setNotifFilter, activeRole, onOpen }) {
  const filteredList = roleNotifications.filter(n => (notifFilter === 'unread' ? n.unread : true));

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 text-slate-800 overflow-hidden">
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-teal-400" />
          <h3 className="font-bold text-xs">Notifications Center</h3>
          <span className="bg-teal-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{activeRole}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex space-x-1">
          <button
            onClick={() => setNotifFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold ${notifFilter === 'all' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setNotifFilter('unread')}
            className={`px-3 py-1 rounded-lg font-bold ${notifFilter === 'unread' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Unread ({unreadCount})
          </button>
        </div>
        {unreadCount > 0 && (
          <button onClick={onMarkAllRead} className="text-[11px] text-teal-700 font-bold hover:underline flex items-center space-x-1">
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-bold">No notifications found</p>
          </div>
        ) : (
          filteredList.map((notif) => {
            const IconComponent = notif.icon || Bell;
            return (
              <div
                key={notif.id}
                onClick={() => { onMarkRead(notif.id); onOpen?.(notif); }}
                className={`p-4 hover:bg-slate-50 transition cursor-pointer flex space-x-3 ${notif.unread ? 'bg-teal-50/40' : ''}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${notif.unread ? 'bg-teal-500 text-white shadow' : 'bg-slate-100 text-slate-500'}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">{notif.title}</h4>
                    <span className="text-[10px] text-slate-400">{notif.time}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-tight">{notif.message}</p>
                  {notif.refType === 'ticket' && <span className="inline-block mt-1 text-[10px] font-bold text-teal-700">Open ticket →</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
