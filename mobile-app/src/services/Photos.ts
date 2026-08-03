import { Facility } from '../types';
import { API_BASE_URL } from '../services/api';

/**
 * Renvoie l'URL de la photo à afficher pour un établissement :
 * - la vraie photo si `facility.photoUrl` est renseignée (URL absolue,
 *   ou chemin relatif "/uploads/..." renvoyé par l'upload admin — préfixé
 *   ici avec l'adresse du backend) ;
 * - sinon, une photo d'illustration générique par type (hôpital / CSB),
 *   sans aucune mention affichée dessus.
 */
const FALLBACK: Record<string, string> = {
  hospital: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=60',
  csb: 'https://images.unsplash.com/photo-1587351021355-a479a299d2f9?w=600&q=60',
};

export function getFacilityPhotoUrl(facility: Pick<Facility, 'type' | 'photoUrl'>): string {
  const url = facility.photoUrl;
  if (url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url}`;
  }
  return FALLBACK[facility.type] || FALLBACK.hospital;
}