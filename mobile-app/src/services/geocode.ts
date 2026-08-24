
import axios from 'axios';

export interface GeocodedPlace {
  name: string;
  context?: string; // commune, district, région 
  latitude: number;
  longitude: number;
}


//  @param query  texte à chercher
 
export async function searchPlaces(
  query: string,
  near?: { latitude: number; longitude: number } | null,
): Promise<GeocodedPlace[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        countrycodes: 'mg',
        addressdetails: 1, // pour récupérer la commune / le district / la région
        limit: 8,
      },
      headers: {
        'Accept-Language': 'fr',
        'User-Agent': 'SanteMadagascarApp/1.0',
      },
      timeout: 6000,
    });

    let places: GeocodedPlace[] = (data || []).map((r: any) => {
      const a = r.address || {};
      const commune = a.city || a.town || a.village || a.municipality || '';
      const district = a.county || a.district || a.state_district || '';
      const region = a.state || a.region || '';
      return {
        name: r.display_name.split(',')[0] || query,
        context: [commune, district, region].filter(Boolean).join(', '),
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
      };
    });

    if (near) {
      places = places
        .map((p) => ({
          ...p,
          dist: Math.hypot(p.latitude - near.latitude, p.longitude - near.longitude),
        }))
        .sort((a, b) => a.dist - b.dist)
        .map(({ dist, ...p }) => p);
    }

    return places;
  } catch {
    return [];
  }
}