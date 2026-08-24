
export type FacilityCategory =
  | 'chu'
  | 'hospital'
  | 'csb2'
  | 'csb1'
  | 'pharmacy'
  | 'clinic'
  | 'maternity'
  | 'other';

export interface CategoryMeta {
  color: string;
  icon: any; // nom d'icône Ionicons
  label: string;
}

export const CATEGORY_META: Record<FacilityCategory, CategoryMeta> = {
  chu: { color: '#c0392b', icon: 'business', label: 'CHU / CHR / CHD' },
  hospital: { color: '#e74c3c', icon: 'medkit', label: 'Hôpital' },
  csb2: { color: '#2980b9', icon: 'person', label: 'CSB II / Médecin' },
  csb1: { color: '#5dade2', icon: 'person-outline', label: 'CSB I' },
  pharmacy: { color: '#27ae60', icon: 'flask', label: 'Pharmacie' },
  clinic: { color: '#8e44ad', icon: 'business-outline', label: 'Clinique' },
  maternity: { color: '#e91e8c', icon: 'woman', label: 'Maternité' },
  other: { color: '#7f8c8d', icon: 'add-circle', label: 'Autre formation sanitaire' },
};

// Ordre d'affichage dans la légende.
export const CATEGORY_ORDER: FacilityCategory[] = [
  'chu', 'hospital', 'csb2', 'csb1', 'pharmacy', 'clinic', 'maternity', 'other',
];


export function classifyFacilityCategory(props: {
  name?: string | null;
  amenity?: string | null;
  healthcare?: string | null;
}): FacilityCategory {
  const name = (props.name || '').toLowerCase();
  const amenity = (props.amenity || '').toLowerCase();
  const healthcare = (props.healthcare || '').toLowerCase();

  if (amenity === 'pharmacy' || healthcare === 'pharmacy') return 'pharmacy';
  if (/\bchu\b/.test(name) || /\bchrr?\b/.test(name) || /\bchrd\b/.test(name) || /\bchd\b/.test(name)) return 'chu';
  if (/matern/.test(name) || healthcare === 'birthing_center') return 'maternity';
  if (/clinique/.test(name) || healthcare === 'clinic' || amenity === 'clinic') return 'clinic';
  if (/csb\s*ii\b/.test(name) || /\bcsb\s*2\b/.test(name) || healthcare === 'doctor') return 'csb2';
  if (/csb\s*i\b/.test(name) || /\bcsb\s*1\b/.test(name)) return 'csb1';
  if (amenity === 'hospital' || healthcare === 'hospital') return 'hospital';
  return 'other';
}