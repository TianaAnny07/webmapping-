/**
 * Source UNIQUE de vérité pour les catégories d'établissements de santé :
 * couleur, icône et libellé. Utilisé à la fois par la légende
 * (MapLegend.tsx) ET par les marqueurs affichés sur la carte
 * (CategoryMarker.tsx, FloatingMarker.tsx) — pour qu'ils ne puissent
 * jamais se désynchroniser l'un de l'autre.
 */
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

/**
 * Détermine la catégorie d'un établissement à partir de son nom et de ses
 * tags OSM (amenity, healthcare). Le système de santé malgache encode
 * généralement le niveau directement dans le nom ("CSB II Ambohipo",
 * "CHU Antananarivo"...), donc l'analyse du nom est la méthode la plus
 * fiable en complément des tags.
 */
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