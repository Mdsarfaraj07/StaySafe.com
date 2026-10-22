export const GENDER_POLICY = { MALE_ONLY: 'Men only', FEMALE_ONLY: 'Women only', CO_ED: 'Co-ed' };
export const FOOD_POLICY = { VEG_ONLY: 'Pure veg only', NON_VEG_ALLOWED: 'Veg & non-veg allowed' };
export const TENANT_TYPE = { STUDENTS: 'Students only', WORKING_PROFESSIONALS: 'Working professionals only', BOTH: 'Students & professionals' };
export const GENDER = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
export const OCCUPATION = { STUDENT: 'Student', WORKING_PROFESSIONAL: 'Working professional', OTHER: 'Other' };
export const FOOD = { VEG: 'Vegetarian', EGGETARIAN: 'Eggetarian', NON_VEG: 'Non-vegetarian' };
export const FOOD_EMOJI = { VEG: '🥦', EGGETARIAN: '🥚', NON_VEG: '🍗' };
export const SLEEP = { EARLY_BIRD: 'Early bird', NIGHT_OWL: 'Night owl', FLEXIBLE: 'Flexible' };

export const sharingLabel = (n) => (n === 1 ? 'Single room' : n === 2 ? 'Double sharing' : n === 3 ? 'Triple sharing' : `${n}-sharing`);

/** How well a roommate matches the logged-in customer's profile (0-100) with the reasons. */
export function compatibility(me, other) {
  if (!me || !me.complete) return null;
  const sleepOk = !me.sleepSchedule || !other.sleepSchedule || me.sleepSchedule === other.sleepSchedule
    || me.sleepSchedule === 'FLEXIBLE' || other.sleepSchedule === 'FLEXIBLE';
  const checks = [
    ['Same food habits', me.foodPreference === other.foodPreference],
    ['Same occupation', me.occupation === other.occupation],
    ['Compatible sleep schedule', sleepOk],
    ['Same smoking habit', !!me.smokes === !!other.smokes],
    ['Same drinking habit', !!me.drinks === !!other.drinks]
  ];
  const hits = checks.filter(c => c[1]);
  return { score: Math.round((hits.length / checks.length) * 100), reasons: hits.map(c => c[0]) };
}

/** Same semantics as the backend filters on GET /api/properties. */
export function matchesSharingFilters(p, f) {
  const gp = p.genderPolicy || 'CO_ED';
  if (f.gender === 'MALE' && gp === 'FEMALE_ONLY') return false;
  if (f.gender === 'FEMALE' && gp === 'MALE_ONLY') return false;
  if (f.gender === 'CO_ED' && gp !== 'CO_ED') return false;
  if (f.food !== 'ANY' && (p.foodPolicy || 'NON_VEG_ALLOWED') !== f.food) return false;
  const tt = p.tenantType || 'BOTH';
  if (f.tenant !== 'ANY' && tt !== 'BOTH' && tt !== f.tenant) return false;
  const rooms = p.rooms || [];
  if (f.occupancy !== 'ANY') {
    const n = Number(f.occupancy);
    if (!rooms.some(r => (n >= 4 ? r.occupancy >= 4 : r.occupancy === n))) return false;
  }
  if (f.availableOnly && !rooms.some(r => r.availableBeds > 0)) return false;
  return true;
}
