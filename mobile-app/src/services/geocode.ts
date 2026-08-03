import axios from 'axios';

export interface GeocodedPlace {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Recherche de lieux (villes, villages, quartiers…) à Madagascar via
 * Nominatim (OpenStreetMap) — gratuit, sans clé API. Complète la
 * recherche d'établissements de santé pour permettre de taper le nom
 * d'une ville qui n'est pas forcément associée à un hôpital/CSB.
 *
 * ⚠️ Nominatim est un service public à usage raisonnable (max ~1
 * requête/seconde, pas conçu pour un très gros volume). Pour une
 * application à large échelle, prévoir à terme un serveur Nominatim
 * auto-hébergé ou un service de géocodage payant.
 */
export async function searchPlaces(query: string): Promise<GeocodedPlace[]> {
  if (!query.trim() || query.trim().length < 3) return [];
  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', countrycodes: 'mg', limit: 5 },
      headers: {
        'Accept-Language': 'fr',
        'User-Agent': 'SanteMadagascarApp/1.0',
      },
      timeout: 6000,
    });
    return (data || []).map((r: any) => ({
      name: r.display_name.split(',')[0],
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    }));
  } catch {
    return [];
  }
}