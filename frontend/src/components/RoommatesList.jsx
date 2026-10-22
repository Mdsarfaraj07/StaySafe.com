import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { getRoommates } from '../api/services';
import { GENDER, OCCUPATION, FOOD, FOOD_EMOJI, SLEEP, compatibility } from '../utils/sharing';

const chip = 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700';

/** Current roommates / flatmates of a property with a compatibility score against the viewer's profile. */
export default function RoommatesList({ propertyId, user, myProfile, onNeedProfile }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    getRoommates(propertyId).then(setList).catch((e) => setError(e.message));
  }, [propertyId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4">Sign in to see who you could be sharing with.</p>;
  if (error) return <p className="text-xs text-rose-600">{error}</p>;
  if (!list) return <p className="text-xs text-slate-400">Loading roommates...</p>;

  const isCustomer = user.role === 'CUSTOMER';
  return (
    <div className="space-y-3">
      {isCustomer && !myProfile?.complete && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Complete your roommate profile to see how well you match. <button onClick={onNeedProfile} className="font-bold underline">Complete now</button>
        </p>
      )}
      {list.length === 0 && <p className="text-xs text-slate-400">No roommate details shared yet for this property.</p>}
      {list.map((r, i) => {
        const match = isCustomer ? compatibility(myProfile, r) : null;
        return (
          <div key={i} className="p-4 border border-slate-200 rounded-xl bg-white flex gap-3">
            <Avatar user={{ name: r.name, avatarUrl: r.avatarUrl }} className="w-12 h-12 rounded-full shrink-0" fallbackClass="bg-gradient-to-tr from-teal-400 to-blue-500 text-slate-900 text-sm" />
            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <b className="text-slate-900 text-sm">{r.name}</b>
                  <span className="text-slate-400"> • {GENDER[r.gender]}, {r.ageGroup}</span>
                  <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${r.source === 'MEMBER' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'}`}>{r.source === 'MEMBER' ? 'StaySafe member' : 'Current resident'}</span>
                </div>
                {match && <span className={`font-black text-sm ${match.score >= 80 ? 'text-teal-700' : match.score >= 60 ? 'text-amber-600' : 'text-slate-500'}`} title={match.reasons.join(', ')}>{match.score}% match</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={chip}>{OCCUPATION[r.occupation]}{r.organization ? ` • ${r.organization}` : ''}</span>
                <span className={chip}>{FOOD_EMOJI[r.foodPreference]} {FOOD[r.foodPreference]}</span>
                {r.sleepSchedule && <span className={chip}>🌙 {SLEEP[r.sleepSchedule]}</span>}
                <span className={chip}>{r.smokes ? '🚬 Smokes' : '🚭 Non-smoker'}</span>
                <span className={chip}>{r.drinks ? '🍺 Drinks' : '🚫 No alcohol'}</span>
                {r.languages && <span className={chip}>🗣 {r.languages}</span>}
              </div>
              {r.bio && <p className="text-slate-600">{r.bio}</p>}
              <p className="text-[11px] text-slate-400">
                {r.roomLabel ? `${r.roomLabel} • ` : ''}{r.moveIn ? (new Date(r.moveIn) > new Date() ? `moving in ${r.moveIn}` : `since ${r.moveIn}`) : ''}
              </p>
              {match && match.reasons.length > 0 && <p className="text-[11px] text-teal-700">✓ {match.reasons.join(' • ')}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
