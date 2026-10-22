import React from 'react';
import { assetUrl } from '../api/client';

/** Profile photo, or the user's initials when no photo was uploaded. */
export default function Avatar({ user, className = 'w-10 h-10 rounded-full', fallbackClass = 'bg-slate-700 text-white' }) {
  const initials = (user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (user?.avatarUrl) {
    return <img src={assetUrl(user.avatarUrl)} alt={user.name} className={`${className} object-cover`} />;
  }
  return <div className={`${className} ${fallbackClass} flex items-center justify-center font-black`}>{initials}</div>;
}
