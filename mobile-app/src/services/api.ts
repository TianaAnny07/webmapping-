// import axios from 'axios';

// // ⚠️ En développement avec Expo Go sur un téléphone physique, remplacez "localhost"
// // par l'adresse IP locale de votre machine (ex: http://192.168.1.10:3000/api/v1)
// export const API_BASE_URL = 'http://localhost:3000/api/v1';
// export const WS_BASE_URL = 'http://localhost:3000';

// export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

// export async function searchFacilities(query: string) {
//   const { data } = await api.get('/facilities/search', { params: { q: query } });
//   return data;
// }

// export async function getFacility(id: string) {
//   const { data } = await api.get(`/facilities/${id}`);
//   return data;
// }

// export async function getAllFacilities(type?: 'hospital' | 'csb') {
//   const { data } = await api.get('/facilities', { params: { type } });
//   return data;
// }

// export async function getNearbyFacilities(lat: number, lon: number, radiusKm = 25, limit = 15) {
//   const { data } = await api.get('/facilities/nearby', { params: { lat, lon, radiusKm, limit } });
//   return data;
// }

// export async function getItinerary(
//   fromLat: number, fromLon: number, toLat: number, toLon: number,
//   profile: 'driving' | 'walking' = 'driving',
// ) {
//   const { data } = await api.get('/routing/itinerary', {
//     params: { fromLat, fromLon, toLat, toLon, profile },
//   });
//   return data as { distanceMeters: number; durationSeconds: number; geometry: [number, number][] };
// }

import axios from 'axios';
import { Facility, FacilityType } from '../types';

// ⚠️ À ADAPTER : mettez l'adresse IP locale de votre PC (celle qui fait tourner le backend NestJS),
// pas "localhost" — sur un téléphone physique / Expo Go, "localhost" désigne le téléphone lui-même.
// - Simulateur iOS (Mac)       : http://localhost:5000
// - Émulateur Android          : http://10.0.2.2:5000
// - Téléphone physique + Wi-Fi : http://<IP_LOCALE_DE_VOTRE_PC>:5000  (ex: http://192.168.1.10:5000)
//   → trouvez votre IP avec `ipconfig` (Windows) ou `ifconfig` / `ip a` (Mac/Linux)
export const API_BASE_URL = 'http://localhost:5000';

// Le backend NestJS actuel n'a pas de serveur WebSocket (voir AlertContext.tsx) :
// cette URL n'est donc pas utilisée pour l'instant, gardée pour référence future.
export const WS_BASE_URL = API_BASE_URL;

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

// ---------------------------------------------------------------------------
// Le backend NestJS de ce projet n'expose que :
//   GET /facilities/geojson   → toutes les formations sanitaires (GeoJSON)
// Il n'y a pas de routes /facilities/search, /facilities/nearby, /facilities/:id
// ni /routing/itinerary. On récupère donc TOUTES les données une seule fois,
// et on fait la recherche, le filtrage "à proximité" et le tri, ici, côté mobile.
// ---------------------------------------------------------------------------

interface BackendFacilityProperties {
  id: number;
  name: string | null;
  amenity: string | null;
  healthcare: string | null;
  operatorType: string | null;
  adm1Name: string | null;
  adm2Name: string | null;
  adm3Name: string | null;
  openingTime: string | null;
  closingTime: string | null;
  openingDays: string | null;
  is24h: boolean;
  phone: string | null;
  services: string | null;
}

interface BackendFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: [number, number] } | null;
  properties: BackendFacilityProperties;
}

interface BackendFeatureCollection {
  type: 'FeatureCollection';
  features: BackendFeature[];
}

// Cache mémoire simple pour éviter de re-télécharger tout le jeu de données
// à chaque recherche / calcul de proximité pendant la session.
let facilitiesCache: Facility[] | null = null;
let facilitiesCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function classifyType(props: BackendFacilityProperties): FacilityType {
  // Le backend n'a pas de champ "type" hôpital/CSB dédié : on déduit
  // à partir de amenity / healthcare, comme le fait le jeu de données OSM d'origine.
  if (props.amenity === 'hospital' || props.healthcare === 'hospital') return 'hospital';
  return 'csb';
}

function buildHours(props: BackendFacilityProperties): string | undefined {
  if (props.is24h) return 'Ouvert 24h/24';
  if (props.openingTime && props.closingTime) {
    const days = props.openingDays ? `${props.openingDays} · ` : '';
    return `${days}${props.openingTime} - ${props.closingTime}`;
  }
  return undefined;
}

function mapToFacility(feature: BackendFeature): Facility | null {
  if (!feature.geometry || feature.geometry.type !== 'Point') return null;
  const [longitude, latitude] = feature.geometry.coordinates;
  const props = feature.properties;

  return {
    id: String(props.id),
    name: props.name || 'Établissement sans nom',
    type: classifyType(props),
    latitude,
    longitude,
    region: props.adm1Name || undefined,
    district: props.adm2Name || undefined,
    address: props.adm3Name || undefined,
    // Ces champs n'existent pas dans les données du backend actuel :
    // on met des valeurs par défaut pour que l'UI mobile (qui les attend) ne casse pas.
    beds: 0,
    staff: 0,
    accessibility: 'medium',
    status: 'operational',
    phone: props.phone || undefined,
    hours: buildHours(props),
  };
}

async function fetchAllFacilities(): Promise<Facility[]> {
  const now = Date.now();
  if (facilitiesCache && now - facilitiesCacheAt < CACHE_TTL_MS) {
    return facilitiesCache;
  }
  const { data } = await api.get<BackendFeatureCollection>('/facilities/geojson');
  const mapped = data.features
    .map(mapToFacility)
    .filter((f): f is Facility => f !== null);
  facilitiesCache = mapped;
  facilitiesCacheAt = now;
  return mapped;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function searchFacilities(query: string): Promise<Facility[]> {
  const all = await fetchAllFacilities();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter((f) => f.name.toLowerCase().includes(q));
}

export async function getFacility(id: string): Promise<Facility | undefined> {
  const all = await fetchAllFacilities();
  return all.find((f) => f.id === id);
}

export async function getAllFacilities(type?: FacilityType): Promise<Facility[]> {
  const all = await fetchAllFacilities();
  if (!type) return all;
  return all.filter((f) => f.type === type);
}

export async function getNearbyFacilities(
  lat: number,
  lon: number,
  radiusKm = 25,
  limit = 15,
): Promise<Facility[]> {
  const all = await fetchAllFacilities();
  return all
    .map((f) => ({ ...f, distanceKm: Math.round(haversineKm(lat, lon, f.latitude, f.longitude) * 10) / 10 }))
    .filter((f) => f.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Itinéraire : le backend n'a pas de route /routing/itinerary, donc on appelle
// directement le service public OSRM, exactement comme le fait le frontend web
// (voir frontend/src/components/Routing.jsx et frontend/src/config.js).
// ---------------------------------------------------------------------------

const OSRM_URL = 'https://router.project-osrm.org/route/v1';

export async function getItinerary(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  profile: 'driving' | 'walking' = 'driving',
): Promise<{ distanceMeters: number; durationSeconds: number; geometry: [number, number][] }> {
  const url = `${OSRM_URL}/${profile}/${fromLon},${fromLat};${toLon},${toLat}`;
  const { data } = await axios.get(url, {
    params: { overview: 'full', geometries: 'geojson' },
    timeout: 15000,
  });

  const route = data?.routes?.[0];
  if (!route) {
    throw new Error("Aucun itinéraire trouvé.");
  }

  // OSRM renvoie les coordonnées en [lon, lat] ; l'app mobile attend [lat, lon].
  const geometry: [number, number][] = route.geometry.coordinates.map(
    ([lon, lat]: [number, number]) => [lat, lon],
  );

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry,
  };
}
