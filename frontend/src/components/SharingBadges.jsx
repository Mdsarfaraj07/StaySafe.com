import React from 'react';
import { sharingLabel } from '../utils/sharing';

const chip = 'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap';

/** Gender / food / occupant-type / sharing chips (size "lg" also shows house rules). */
export default function SharingBadges({ property: p, size = 'sm' }) {
  const gender = {
    MALE_ONLY: ['♂ Men only', 'bg-blue-50 text-blue-700 border-blue-200'],
    FEMALE_ONLY: ['♀ Women only', 'bg-pink-50 text-pink-700 border-pink-200'],
    CO_ED: ['⚥ Co-ed', 'bg-slate-50 text-slate-700 border-slate-200']
  }[p.genderPolicy || 'CO_ED'];
  const food = p.foodPolicy === 'VEG_ONLY'
    ? ['🥦 Pure veg', 'bg-green-50 text-green-700 border-green-200']
    : ['🍗 Veg & non-veg', 'bg-orange-50 text-orange-700 border-orange-200'];
  const tenant = {
    STUDENTS: '🎓 Students',
    WORKING_PROFESSIONALS: '💼 Working professionals',
    BOTH: '🎓💼 Students & professionals'
  }[p.tenantType || 'BOTH'];
  const occ = [...new Set((p.rooms || []).map(r => r.occupancy))].sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`${chip} ${gender[1]}`}>{gender[0]}</span>
      <span className={`${chip} ${food[1]}`}>{food[0]}</span>
      <span className={`${chip} bg-indigo-50 text-indigo-700 border-indigo-200`}>{tenant}</span>
      {occ.length > 0 && (
        <span className={`${chip} bg-teal-50 text-teal-700 border-teal-200`}>
          🛏 {occ.map(n => (n === 1 ? 'Single' : `${n}-sharing`)).join(' / ')}
        </span>
      )}
      {size === 'lg' && (
        <>
          <span className={`${chip} ${p.smokingAllowed ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{p.smokingAllowed ? '🚬 Smoking allowed' : '🚭 No smoking'}</span>
          <span className={`${chip} ${p.drinkingAllowed ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{p.drinkingAllowed ? '🍺 Alcohol allowed' : '🚫 No alcohol'}</span>
          <span className={`${chip} bg-slate-50 text-slate-600 border-slate-200`}>{p.petsAllowed ? '🐾 Pets allowed' : '🐾 No pets'}</span>
          <span className={`${chip} bg-slate-50 text-slate-600 border-slate-200`}>{p.visitorsAllowed ? '👥 Visitors allowed' : '👥 No visitors'}</span>
        </>
      )}
    </div>
  );
}

export { sharingLabel };
