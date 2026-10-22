import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X, Star } from 'lucide-react';
import { assetUrl } from '../api/client';
import { uploadPropertyPhotos } from '../api/services';
import { compressImage, validateImage } from '../utils/image';

/** Multi-photo upload with drag & drop. The first photo is the cover image. */
export default function PhotoUploader({ photos, onChange, showToast, max = 8 }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const addFiles = async (list) => {
    const room = max - photos.length;
    if (room <= 0) { showToast(`You can add up to ${max} photos`); return; }
    const files = Array.from(list).slice(0, room);
    for (const f of files) {
      const err = validateImage(f);
      if (err) { showToast(`${f.name}: ${err}`); return; }
    }
    setBusy(true);
    try {
      const prepared = await Promise.all(files.map(f => compressImage(f)));
      const fd = new FormData();
      prepared.forEach(f => fd.append('files', f));
      const { urls } = await uploadPropertyPhotos(fd);
      onChange([...photos, ...urls]);
    } catch (e) { showToast(e.message); }
    finally { setBusy(false); }
  };

  const makeCover = (i) => onChange([photos[i], ...photos.filter((_, k) => k !== i)]);
  const remove = (i) => onChange(photos.filter((_, k) => k !== i));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((url, i) => (
          <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
            <img src={assetUrl(url)} alt={`Property ${i + 1}`} className="w-full h-full object-cover" />
            {i === 0 && <span className="absolute top-1 left-1 bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Cover</span>}
            <div className="absolute inset-0 bg-slate-900/55 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
              {i > 0 && <button type="button" onClick={() => makeCover(i)} className="flex items-center space-x-1 bg-white text-slate-800 text-[10px] font-bold px-2 py-1 rounded"><Star className="w-3 h-3" /><span>Make cover</span></button>}
              <button type="button" onClick={() => remove(i)} className="flex items-center space-x-1 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded"><X className="w-3 h-3" /><span>Remove</span></button>
            </div>
          </div>
        ))}

        {photos.length < max && (
          <button type="button" disabled={busy}
            onClick={() => input.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
            className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-[10px] font-bold transition ${drag ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600'}`}>
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            <span className="mt-1">{busy ? 'Uploading...' : 'Add photos'}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      <p className="text-[11px] text-slate-400">{photos.length}/{max} photos • JPG, PNG or WebP • the first photo is the cover</p>
    </div>
  );
}
