import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Share2, MapPin, ShieldCheck, CheckCircle, Check, Star, ChevronRight, X } from 'lucide-react';
import { getProperty, getReviews, addReview, getEligibility, getTenantProfile } from '../api/services';
import { assetUrl } from '../api/client';
import LocationMap from '../components/LocationMap';
import SharingBadges from '../components/SharingBadges';
import RoommatesList from '../components/RoommatesList';
import TenantProfileForm from '../components/TenantProfileForm';
import { sharingLabel } from '../utils/sharing';

export default function PropertyDetailView({ property: initial, user, initialDraft, onBack, onProceedToBooking, onReviewAdded, showToast, favorites, onToggleFavorite }) {
  const [property, setProperty] = useState(initial);
  const [activeTab, setActiveTab] = useState('overview');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [checkIn, setCheckIn] = useState(initialDraft.checkIn);
  const [checkOut, setCheckOut] = useState(initialDraft.checkOut);
  const [roomId, setRoomId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [elig, setElig] = useState(null);            // { eligible, reasons } for logged-in customers
  const [myProfile, setMyProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isCustomer = user?.role === 'CUSTOMER';
  const rooms = property.rooms || [];
  const room = rooms.find(r => r.id === roomId) || rooms.find(r => r.availableBeds > 0) || rooms[0];

  const loadEligibility = () => {
    if (!isCustomer) { setElig(null); return; }
    getEligibility(initial.id).then(setElig).catch(() => {});
    getTenantProfile().then(setMyProfile).catch(() => {});
  };

  useEffect(() => {
    getProperty(initial.id).then(setProperty).catch(() => {});
    getReviews(initial.id).then(setReviews).catch(() => {});
    loadEligibility();
  }, [initial.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await addReview(property.id, Number(rating), comment);
      setComment('');
      setReviews(await getReviews(property.id));
      setProperty(await getProperty(property.id));
      onReviewAdded();
      showToast('Thanks for your review!');
    } catch (err) { showToast(err.message); }
  };

  const book = () => {
    if (!room) { showToast('No room options available'); return; }
    if (room.availableBeds < 1) { showToast('No beds left in this room type'); return; }
    if (!checkIn || !checkOut || checkOut <= checkIn) { showToast('Check-out must be after check-in'); return; }
    if (checkIn < today) { showToast('Check-in cannot be in the past'); return; }
    if (isCustomer && elig && !elig.eligible) {
      showToast(elig.reasons[0]);
      if (!myProfile?.complete) setShowProfile(true);
      return;
    }
    onProceedToBooking({ checkIn, checkOut, guests: '1 Guest', roomId: room.id });
  };

  const share = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    showToast('Property URL copied to clipboard');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-teal-600 transition bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
          <ArrowLeft className="w-4 h-4" /><span>Back to Properties</span>
        </button>
        <div className="flex items-center space-x-3">
          <button onClick={() => onToggleFavorite(property.id)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-500 shadow-sm transition">
            <Heart className={`w-4 h-4 ${favorites.includes(property.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <button onClick={share} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-teal-600 shadow-sm transition"><Share2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="mb-8 space-y-3">
        <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden shadow-md bg-slate-100">
          <img src={assetUrl(property.images[photoIdx] || property.images[0])} alt={property.name} className="w-full h-full object-cover" />
          {property.images.length > 1 && (
            <>
              <button onClick={() => setPhotoIdx((photoIdx - 1 + property.images.length) % property.images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white w-9 h-9 rounded-full shadow font-black">‹</button>
              <button onClick={() => setPhotoIdx((photoIdx + 1) % property.images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white w-9 h-9 rounded-full shadow font-black">›</button>
              <span className="absolute bottom-3 right-3 bg-slate-900/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">{photoIdx + 1} / {property.images.length}</span>
            </>
          )}
        </div>
        {property.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {property.images.map((img, i) => (
              <button key={img} onClick={() => setPhotoIdx(i)} className={`shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 ${i === photoIdx ? 'border-teal-600' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <img src={assetUrl(img)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-black text-slate-900">{property.name}</h1>
              {property.verified && (
                <span className="bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1 border border-teal-200"><ShieldCheck className="w-4 h-4 text-teal-600" /><span>StaySafe Verified</span></span>
              )}
            </div>
            <p className="text-slate-500 text-xs flex items-center space-x-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>{property.location}</span><span className="text-slate-300">•</span><span>{property.type}</span><span className="text-slate-300">•</span><span>Hosted by {property.owner}</span></p>
            <SharingBadges property={property} size="lg" />
          </div>

          <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto">
            {['overview', 'roommates', 'amenities', 'location', 'rules', 'reviews'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 font-bold text-xs capitalize transition border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500'}`}>{tab}</button>
            ))}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-sm">
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">Description</h3>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">{property.description}</p>
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase mb-2 text-teal-700">Rooms & sharing</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead><tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]"><th className="pb-2">Room</th><th className="pb-2">Sharing</th><th className="pb-2">Features</th><th className="pb-2 text-right">Per bed / month</th><th className="pb-2 text-right">Beds left</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {rooms.map(r => (
                          <tr key={r.id}>
                            <td className="py-2 font-bold text-slate-900">{r.label}</td>
                            <td className="py-2 text-slate-600">{sharingLabel(r.occupancy)}</td>
                            <td className="py-2 text-slate-500">{r.acRoom ? 'AC' : 'Non-AC'}{r.attachedBathroom ? ' • Attached bath' : ''}</td>
                            <td className="py-2 text-right font-bold text-teal-700">₹{r.pricePerBed.toLocaleString()}</td>
                            <td className={`py-2 text-right font-bold ${r.availableBeds > 0 ? 'text-teal-700' : 'text-rose-600'}`}>{r.availableBeds > 0 ? `${r.availableBeds} of ${r.totalBeds}` : 'Full'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-xs uppercase mb-3 text-teal-700">StaySafe Verification Passport</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {['Govt ID Verified Host', 'Property Deed Verified', 'On-Site Safety Audit', '24/7 Security On Duty'].map(item => (
                      <div key={item} className="flex items-center space-x-2 p-3 bg-slate-50 rounded-xl"><CheckCircle className="w-4 h-4 text-teal-600" /><span>{item}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'roommates' && (
              <RoommatesList propertyId={property.id} user={user} myProfile={myProfile} onNeedProfile={() => setShowProfile(true)} />
            )}

            {activeTab === 'amenities' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {property.amenities.map((am, i) => (
                  <div key={i} className="flex items-center space-x-2.5 p-3 bg-slate-50 rounded-xl font-semibold text-xs text-slate-700"><Check className="w-4 h-4 text-teal-600" /><span>{am}</span></div>
                ))}
              </div>
            )}

            {activeTab === 'location' && (
              <div className="space-y-3">
                {property.latitude != null ? (
                  <>
                    <LocationMap lat={property.latitude} lng={property.longitude} height={320} />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600"><b>{property.location}</b>{property.address ? ` — ${property.address}` : ''}</span>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`} target="_blank" rel="noreferrer" className="bg-slate-900 text-white font-bold px-3 py-2 rounded-lg hover:bg-teal-600 transition">Open in Google Maps ↗</a>
                    </div>
                  </>
                ) : <p className="text-xs text-slate-400">The owner has not pinned this property on the map yet.</p>}
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-2 text-xs text-slate-700">
                <p>• {property.genderPolicy === 'MALE_ONLY' ? 'Men only.' : property.genderPolicy === 'FEMALE_ONLY' ? 'Women only.' : 'Co-ed: all genders welcome.'}</p>
                <p>• {property.foodPolicy === 'VEG_ONLY' ? 'Pure vegetarian house — no eggs or non-veg on the premises.' : 'Vegetarian and non-vegetarian food allowed.'}</p>
                <p>• {property.tenantType === 'STUDENTS' ? 'For students only.' : property.tenantType === 'WORKING_PROFESSIONALS' ? 'For working professionals only.' : 'Students and working professionals welcome.'}</p>
                <p>• {property.smokingAllowed ? 'Smoking allowed in designated areas.' : 'No smoking.'} {property.drinkingAllowed ? 'Alcohol allowed.' : 'No alcohol.'}</p>
                <p>• {property.petsAllowed ? 'Pets allowed.' : 'No pets.'} {property.visitorsAllowed ? 'Visitors allowed in common areas till 8:00 PM.' : 'No visitors.'}</p>
                <p>• Gate closes at 11:00 PM for safety.</p>
                <p>• Security deposit: ₹{property.deposit.toLocaleString()} per bed (refundable).</p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-4">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-base text-slate-900">{property.rating} / 5.0</span>
                  <span className="text-xs text-slate-400">({property.reviewsCount} resident reviews)</span>
                </div>
                {reviews.length === 0 && <p className="text-xs text-slate-400">No written reviews yet.</p>}
                {reviews.map(r => (
                  <div key={r.id} className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                    <div className="flex justify-between"><span className="font-bold text-slate-800">{r.userName}</span><span className="text-amber-500 font-bold">{'★'.repeat(r.rating)}</span></div>
                    <p className="mt-1">{r.comment}</p><span className="text-[10px] text-slate-400">{r.date}</span>
                  </div>
                ))}
                {isCustomer && (
                  <form onSubmit={submitReview} className="mt-4 p-4 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <h4 className="font-bold uppercase text-slate-500">Write a review (requires a booking)</h4>
                    <select value={rating} onChange={(e) => setRating(e.target.value)} className="p-2 rounded-lg border border-slate-200">{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} stars</option>)}</select>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience..." className="w-full p-2.5 rounded-lg border border-slate-200 h-20 focus:outline-none" />
                    <button className="bg-teal-600 text-white font-bold px-4 py-2 rounded-lg">Submit Review</button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* booking card */}
        <div>
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 sticky top-24 space-y-5">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-2xl font-black text-slate-900">₹{(room ? room.pricePerBed : property.price).toLocaleString()}</span>
                <span className="text-xs text-slate-500"> / bed / month</span>
              </div>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">Fully Inclusive</span>
            </div>

            <div className="space-y-2">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Choose your sharing</span>
              {rooms.map(r => (
                <label key={r.id} className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${room?.id === r.id ? 'border-teal-600 bg-teal-50' : 'border-slate-200'} ${r.availableBeds < 1 ? 'opacity-50' : ''}`}>
                  <span className="flex items-center space-x-2">
                    <input type="radio" name="room" className="accent-teal-600" checked={room?.id === r.id} disabled={r.availableBeds < 1} onChange={() => setRoomId(r.id)} />
                    <span><b className="text-slate-900">{r.label}</b><span className="block text-[10px] text-slate-500">{sharingLabel(r.occupancy)} • {r.acRoom ? 'AC' : 'Non-AC'}{r.attachedBathroom ? ' • Attached bath' : ''}</span></span>
                  </span>
                  <span className="text-right"><b className="text-teal-700">₹{r.pricePerBed.toLocaleString()}</b><span className={`block text-[10px] font-bold ${r.availableBeds > 0 ? 'text-slate-500' : 'text-rose-600'}`}>{r.availableBeds > 0 ? `${r.availableBeds} left` : 'Full'}</span></span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Check-in Date</label>
                <input type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="bg-transparent font-semibold mt-1 w-full focus:outline-none" />
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Check-out Date</label>
                <input type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="bg-transparent font-semibold mt-1 w-full focus:outline-none" />
              </div>
            </div>

            {isCustomer && elig && (
              elig.eligible
                ? <p className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 rounded-lg p-2.5">✓ Your profile matches this property's rules.</p>
                : (
                  <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2.5 space-y-1">
                    {elig.reasons.map((r, i) => <p key={i}>✗ {r}</p>)}
                    {!myProfile?.complete && <button onClick={() => setShowProfile(true)} className="font-bold underline">Complete roommate profile</button>}
                  </div>
                )
            )}

            <button onClick={book} disabled={!room || room.availableBeds < 1}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50">
              <span>{room && room.availableBeds < 1 ? 'No beds left' : 'Book this bed & pay'}</span><ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 my-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">Your roommate profile</h3>
              <button onClick={() => setShowProfile(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-500">Owners and roommates need a few basics so everyone is matched with the right house.</p>
            <TenantProfileForm showToast={showToast} submitLabel="Save & continue" onSaved={() => { setShowProfile(false); loadEligibility(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
