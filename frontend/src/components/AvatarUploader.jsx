import React, { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import Avatar from './Avatar';
import { uploadAvatar, removeAvatar } from '../api/services';
import { compressImage, validateImage } from '../utils/image';

/** Click the avatar to upload / replace the profile photo; the small x removes it. */
export default function AvatarUploader({ user, fallbackClass, onUpdated, showToast, className = 'w-16 h-16 rounded-2xl text-2xl' }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = validateImage(file);
    if (err) { showToast(err); return; }
    setBusy(true);
    try {
      const blob = await compressImage(file, 600, 0.9);
      const fd = new FormData();
      fd.append('file', blob, 'avatar.jpg');
      onUpdated(await uploadAvatar(fd));
      showToast('Profile photo updated');
    } catch (ex) { showToast(ex.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { onUpdated(await removeAvatar()); showToast('Profile photo removed'); }
    catch (ex) { showToast(ex.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative group shrink-0">
      <button type="button" onClick={() => input.current.click()} title="Change profile photo"
        className={`relative block overflow-hidden shadow-lg ${className}`}>
        <Avatar user={user} className="w-full h-full" fallbackClass={fallbackClass} />
        <span className={`absolute inset-0 bg-slate-900/60 flex items-center justify-center transition ${busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {busy ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
        </span>
      </button>
      {user.avatarUrl && !busy && (
        <button type="button" onClick={remove} title="Remove photo"
          className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 hidden group-hover:block">
          <X className="w-3 h-3" />
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
    </div>
  );
}
