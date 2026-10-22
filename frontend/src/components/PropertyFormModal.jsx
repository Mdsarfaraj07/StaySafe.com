import React, { useState } from 'react';
import { X } from 'lucide-react';
import PhotoUploader from './PhotoUploader';
import LocationPicker from './LocationPicker';
import RoomOptionsEditor, { emptyRoom } from './RoomOptionsEditor';
import { createOwnerProperty, updateOwnerProperty, uploadPropertyDocument } from '../api/services';
import { GENDER_POLICY, FOOD_POLICY, TENANT_TYPE } from '../utils/sharing';

const AMENITY_OPTIONS = ['WiFi', 'AC', 'Food Included', 'Laundry', 'Parking', 'Gym', 'Housekeeping', 'Power Backup', 'CCTV'];
const field = 'w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500';
const lbl = 'block font-bold uppercase text-slate-500 mb-1';

/** Create or edit a listing: details, photos, map location, sharing rules and room options. */
export default function PropertyFormModal({ property, onClose, onSaved, showToast }) {
  const editing = !!property;
  const [form, setForm] = useState({
    name: property?.name || '', type: property?.type || 'PG', location: property?.location || '',
    address: property?.address || '', deposit: property ? String(property.deposit) : '',
    description: property?.description || '', amenities: property?.amenities || ['WiFi', 'AC'],
    images: property?.images || [], latitude: property?.latitude ?? null, longitude: property?.longitude ?? null,
    genderPolicy: property?.genderPolicy || 'CO_ED', foodPolicy: property?.foodPolicy || 'NON_VEG_ALLOWED',
    tenantType: property?.tenantType || 'BOTH', smokingAllowed: !!property?.smokingAllowed,
    drinkingAllowed: !!property?.drinkingAllowed, petsAllowed: !!property?.petsAllowed,
    visitorsAllowed: property ? property.visitorsAllowed !== false : true,
    rooms: property?.rooms?.length ? property.rooms.map(r => ({ ...r })) : [emptyRoom(2)]
  });
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState({ ELECTRICITY_BILL: null, OWNERSHIP_PROOF: null, RENTAL_AUTHORIZATION: null, PROPERTY_TAX_RECEIPT: null, OTHER: null });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleAmenity = (a) => setForm({ ...form, amenities: form.amenities.includes(a) ? form.amenities.filter(x => x !== a) : [...form.amenities, a] });

  // fill address / "Area, City" from the map pin when those fields are still empty
  const fromMap = ({ address, area, city }) => setForm((f) => ({
    ...f, address: f.address || address || '', location: f.location || [area, city].filter(Boolean).join(', ')
  }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.images.length === 0) { showToast('Upload at least one property photo'); return; }
    if (!editing && !documents.ELECTRICITY_BILL) { showToast('Upload an electricity bill for property verification'); return; }
    if (!editing && !documents.OWNERSHIP_PROOF && !documents.RENTAL_AUTHORIZATION) { showToast('Upload ownership proof or rental authorization'); return; }
    if (form.latitude === null) { showToast('Pin the property location on the map'); return; }
    for (const r of form.rooms) {
      const total = Number(r.totalBeds), open = Number(r.availableBeds), price = Number(r.pricePerBed);
      if (!r.label.trim() || !(price >= 1) || !(total >= 1) || !(open >= 0)) { showToast(`Fill all details for room "${r.label || 'new room'}"`); return; }
      if (open > total) { showToast(`"${r.label}": open beds cannot exceed total beds`); return; }
    }
    setSaving(true);
    let savedProperty = null;
    try {
      const body = {
        name: form.name, type: form.type, location: form.location, address: form.address,
        deposit: form.deposit ? Number(form.deposit) : null, description: form.description, amenities: form.amenities,
        images: form.images, latitude: form.latitude, longitude: form.longitude,
        genderPolicy: form.genderPolicy, foodPolicy: form.foodPolicy, tenantType: form.tenantType,
        smokingAllowed: form.smokingAllowed, drinkingAllowed: form.drinkingAllowed,
        petsAllowed: form.petsAllowed, visitorsAllowed: form.visitorsAllowed,
        rooms: form.rooms.map(r => ({
          id: r.id ?? null, label: r.label.trim(), occupancy: Number(r.occupancy), pricePerBed: Number(r.pricePerBed),
          totalBeds: Number(r.totalBeds), availableBeds: Number(r.availableBeds), acRoom: !!r.acRoom, attachedBathroom: !!r.attachedBathroom
        }))
      };
      const saved = editing ? await updateOwnerProperty(property.id, body) : await createOwnerProperty(body);
      savedProperty = saved;
      const selectedDocs = Object.entries(documents).filter(([, file]) => !!file);
      for (const [documentType, file] of selectedDocs) await uploadPropertyDocument(saved.id, documentType, file);
      onSaved(saved, editing);
    } catch (err) {
      showToast(savedProperty ? `Listing saved, but a document upload failed. Edit the listing to retry: ${err.message}` : err.message);
      if (savedProperty) onSaved(savedProperty, editing);
    }
    finally { setSaving(false); }
  };

  const check = (k, label) => (
    <label className="flex items-center space-x-2 cursor-pointer text-slate-700 font-medium">
      <input type="checkbox" className="accent-teal-600" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} /><span>{label}</span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white p-6 rounded-2xl max-w-3xl w-full shadow-2xl space-y-4 border border-slate-200 my-6">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-black text-slate-900 text-base">{editing ? `Edit ${property.name}` : 'List New Property for StaySafe Verification'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={submit} className="space-y-5 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label className={lbl}>Property Title</label>
              <input className={field} placeholder="e.g. Urban Heights Deluxe PG" value={form.name} onChange={set('name')} required /></div>
            <div><label className={lbl}>Type</label>
              <select className={field} value={form.type} onChange={set('type')}>
                <option value="PG">PG</option><option value="Room">Room (shared house)</option><option value="Flat">Flat / Apartment</option><option value="Co-living">Co-living Space</option>
              </select></div>
          </div>

          <div><label className={lbl}>Property Photos</label>
            <PhotoUploader photos={form.images} onChange={(images) => setForm({ ...form, images })} showToast={showToast} /></div>

          <div><label className={lbl}>Location on map</label>
            <LocationPicker lat={form.latitude ?? undefined} lng={form.longitude ?? undefined} showToast={showToast}
              onChange={({ lat, lng }) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))} onAddress={fromMap} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Area, City (shown in listings)</label>
              <input className={field} placeholder="Koramangala, Bangalore" value={form.location} onChange={set('location')} required /></div>
            <div><label className={lbl}>Full address</label>
              <input className={field} placeholder="Street, building, pincode" value={form.address} onChange={set('address')} /></div>
          </div>

          <div className="p-4 border border-slate-200 rounded-xl space-y-4 bg-white">
            <div>
              <h4 className="font-black text-slate-900 text-sm">Who can stay here? (sharing rules)</h4>
              <p className="text-slate-500">Customers are checked against these rules when they book.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Gender</label>
                <select className={field} value={form.genderPolicy} onChange={set('genderPolicy')}>{Object.entries(GENDER_POLICY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className={lbl}>Food</label>
                <select className={field} value={form.foodPolicy} onChange={set('foodPolicy')}>{Object.entries(FOOD_POLICY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className={lbl}>Occupants</label>
                <select className={field} value={form.tenantType} onChange={set('tenantType')}>{Object.entries(TENANT_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {check('smokingAllowed', '🚬 Smoking allowed')}
              {check('drinkingAllowed', '🍺 Alcohol allowed')}
              {check('petsAllowed', '🐾 Pets allowed')}
              {check('visitorsAllowed', '👥 Visitors allowed')}
            </div>
          </div>

          <div><label className={lbl}>Room types, price per bed & beds</label>
            <RoomOptionsEditor rooms={form.rooms} onChange={(rooms) => setForm({ ...form, rooms })} /></div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Security deposit per bed (₹)</label>
              <input type="number" className={field} placeholder="Defaults to 2x cheapest bed" value={form.deposit} onChange={set('deposit')} /></div>
          </div>

          <div><label className={lbl}>Description</label>
            <textarea className={`${field} h-16`} value={form.description} onChange={set('description')} /></div>

          <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl space-y-3">
            <div><h4 className="font-black text-slate-900 text-sm">Property verification documents</h4><p className="text-slate-600 mt-1">Upload readable PDF, JPG or PNG files (maximum 10 MB each). Documents are private and visible only to you and authorized StaySafe reviewers.</p></div>
            {[['ELECTRICITY_BILL','Electricity bill (required)'],['OWNERSHIP_PROOF','Ownership proof (required unless rental authorization is provided)'],['RENTAL_AUTHORIZATION','Rental / owner authorization (required unless ownership proof is provided)'],['PROPERTY_TAX_RECEIPT','Property tax receipt (optional)'],['OTHER','Other supporting document (optional)']].map(([key,label]) => (
              <label key={key} className="block"><span className="block text-[11px] font-bold text-slate-700 mb-1">{label}</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e => setDocuments(prev => ({ ...prev, [key]: e.target.files?.[0] || null }))} className="block w-full text-[11px] file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-slate-700" />{documents[key] && <span className="block text-[10px] text-teal-700 mt-1">Selected: {documents[key].name}</span>}</label>
            ))}
          </div>

          <div><label className={lbl}>Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map(a => (
                <button type="button" key={a} onClick={() => toggleAmenity(a)}
                  className={`px-2.5 py-1 rounded-full border font-semibold ${form.amenities.includes(a) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}>{a}</button>
              ))}
            </div></div>

          <div className="p-3 bg-teal-50 rounded-lg text-[11px] text-teal-800 border border-teal-200">
            <span className="font-bold block">Verification:</span>
            {editing && property.status === 'Active'
              ? 'Changing the map location or area of a live listing sends it back to StaySafe Admins for re-verification. Photos, rooms, prices and rules update immediately.'
              : 'Submitted stays are reviewed by StaySafe Admins before going live.'}
          </div>

          <div className="flex space-x-2 pt-1">
            <button type="button" onClick={onClose} className="w-full bg-slate-100 font-bold py-2.5 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="w-full bg-teal-600 text-white font-bold py-2.5 rounded-lg shadow hover:bg-teal-700 disabled:opacity-60">
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Submit Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
