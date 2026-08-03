import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Facility, FacilityType, Itinerary, TravelMode } from '../types';
import { haversineKm } from '../services/Geo';

// ⚠️ À ADAPTER : mettez l'adresse IP locale de votre PC (celle qui fait tourner le backend NestJS),
// pas "localhost" — sur un téléphone physique / Expo Go, "localhost" désigne le téléphone lui-même.
// - Simulateur iOS (Mac)       : http://localhost:5000
// - Émulateur Android          : http://10.0.2.2:5000
// - Téléphone physique + Wi-Fi : http://<IP_LOCALE_DE_VOTRE_PC>:5000  (ex: http://192.168.1.10:5000)
export const API_BASE_URL = 'http://192.168.1.217:5000';
export const WS_BASE_URL = API_BASE_URL; // conservé pour référence, non utilisé actuellement

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

// Attache le token JWT à chaque requête, comme le fait frontend/src/services/api.js.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Établissements (le backend n'expose que GET /facilities/geojson — le reste
// -- recherche, "à proximité", tri -- se fait ici, côté client, comme sur le web).
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
  description: string | null;
  photoUrl: string | null;
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

let facilitiesCache: Facility[] | null = null;
let facilitiesCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function classifyType(props: BackendFacilityProperties): FacilityType {
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
    beds: 0,
    staff: 0,
    accessibility: 'medium',
    status: 'operational',
    phone: props.phone || undefined,
    services: props.services || undefined,
    description: props.description || undefined,
    photoUrl: props.photoUrl || undefined,
    openingTime: props.openingTime || undefined,
    closingTime: props.closingTime || undefined,
    is24h: !!props.is24h,
    hours: buildHours(props),
  };
}

async function fetchAllFacilities(): Promise<Facility[]> {
  const now = Date.now();
  if (facilitiesCache && now - facilitiesCacheAt < CACHE_TTL_MS) {
    return facilitiesCache;
  }
  const { data } = await api.get<BackendFeatureCollection>('/facilities/geojson');
  const mapped = data.features.map(mapToFacility).filter((f): f is Facility => f !== null);
  facilitiesCache = mapped;
  facilitiesCacheAt = now;
  return mapped;
}

/** Invalide le cache local (utile après un pull-to-refresh). */
export function invalidateFacilitiesCache() {
  facilitiesCache = null;
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
// Itinéraire — on utilise maintenant un VRAI profil de routage par mode
// (piéton / vélo / voiture) via le serveur public FOSSGIS, qui héberge les
// 3 profils OSRM séparément. C'est ce qui permet, à pied notamment, d'avoir
// un vrai chemin piéton (raccourcis, sentiers) et pas seulement la route
// carrossable recalculée avec une vitesse plus lente.
// Si ce serveur est indisponible, on retombe sur le serveur public OSRM
// standard (profil "voiture" uniquement), avec une durée estimée à partir
// d'une vitesse moyenne par mode — comme le fait le web.
// ---------------------------------------------------------------------------

const OSRM_ENDPOINTS: Record<TravelMode, { url: string; profile: string }> = {
  walking: { url: 'https://routing.openstreetmap.de/routed-foot/route/v1', profile: 'foot' },
  cycling: { url: 'https://routing.openstreetmap.de/routed-bike/route/v1', profile: 'bike' },
  driving: { url: 'https://routing.openstreetmap.de/routed-car/route/v1', profile: 'driving' },
};
const FALLBACK_OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export const MODE_SPEEDS_KMH: Record<TravelMode, number> = {
  walking: 5,
  cycling: 40, // "Moto" dans l'interface
  driving: 45,
};

function mapRoute(route: any, mode: TravelMode, realDuration: boolean): Itinerary {
  const geometry: [number, number][] = route.geometry.coordinates.map(
    ([lon, lat]: [number, number]) => [lat, lon],
  );
  // Si la durée vient d'un vrai profil piéton/vélo/voiture, on la garde telle
  // quelle (calibrée). Sinon (repli sur le profil voiture générique), on
  // l'estime avec une vitesse moyenne par mode.
  const durationSeconds = realDuration
    ? route.duration
    : (route.distance / 1000 / (MODE_SPEEDS_KMH[mode] || MODE_SPEEDS_KMH.driving)) * 3600;

  const steps = (route.legs || []).flatMap((leg: any) =>
    (leg.steps || []).map((s: any) => ({
      type: s.maneuver.type,
      modifier: s.maneuver.modifier,
      distanceMeters: s.distance,
      location: [s.maneuver.location[1], s.maneuver.location[0]] as [number, number],
      streetName: s.name,
    })),
  );

  return { distanceMeters: route.distance, durationSeconds, geometry, steps };
}

async function fetchOsrmRoutes(
  fromLat: number, fromLon: number, toLat: number, toLon: number, mode: TravelMode, alternatives: boolean,
): Promise<{ routes: any[]; realDuration: boolean }> {
  const endpoint = OSRM_ENDPOINTS[mode];
  try {
    const url = `${endpoint.url}/${endpoint.profile}/${fromLon},${fromLat};${toLon},${toLat}`;
    const { data } = await axios.get(url, {
      params: { overview: 'full', geometries: 'geojson', steps: true, alternatives },
      timeout: 12000,
    });
    if (data?.routes?.length) return { routes: data.routes, realDuration: true };
  } catch {
    // Serveur dédié indisponible → on retombe sur le profil voiture générique ci-dessous.
  }
  const url = `${FALLBACK_OSRM_URL}/${fromLon},${fromLat};${toLon},${toLat}`;
  const { data } = await axios.get(url, {
    params: { overview: 'full', geometries: 'geojson', steps: true, alternatives },
    timeout: 15000,
  });
  return { routes: data?.routes || [], realDuration: false };
}

export async function getItinerary(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  mode: TravelMode = 'driving',
): Promise<Itinerary> {
  const { routes, realDuration } = await fetchOsrmRoutes(fromLat, fromLon, toLat, toLon, mode, false);
  const route = routes[0];
  if (!route) throw new Error('Aucun itinéraire trouvé.');
  return mapRoute(route, mode, realDuration);
}

/**
 * Renvoie plusieurs propositions d'itinéraire (quand le serveur en trouve) :
 * la plus courte en distance, et la "recommandée" (celle que le moteur de
 * routage privilégie). Pour la marche à pied notamment, ça permet à
 * l'utilisateur de choisir un chemin plus court plutôt que le plus "roulant".
 * Note : les alternatives dépendent de la zone — si une seule route existe,
 * elle est renvoyée seule, marquée "recommended".
 */
export async function getItineraryOptions(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  mode: TravelMode = 'driving',
): Promise<Itinerary[]> {
  const { routes, realDuration } = await fetchOsrmRoutes(fromLat, fromLon, toLat, toLon, mode, true);
  if (routes.length === 0) throw new Error('Aucun itinéraire trouvé.');

  const mapped = routes.map((r: any) => mapRoute(r, mode, realDuration));

  if (mapped.length === 1) {
    mapped[0].label = 'recommended';
    return mapped;
  }

  // La plus courte en distance devient "shortest", celle que le moteur classe
  // en premier (généralement la plus rapide/directe) reste "recommended".
  const shortestIdx = mapped.reduce(
    (best: number, r: Itinerary, i: number) => (r.distanceMeters < mapped[best].distanceMeters ? i : best),
    0,
  );
  mapped.forEach((r: Itinerary, i: number) => {
    r.label = i === 0 ? 'recommended' : i === shortestIdx ? 'shortest' : `alt-${i}`;
  });
  if (shortestIdx === 0) mapped[0].label = 'recommended';

  // Dédoublonne : si deux options ont quasi la même distance/durée, n'en garde qu'une.
  const unique: Itinerary[] = [];
  for (const r of mapped) {
    const dup = unique.find((u) => Math.abs(u.distanceMeters - r.distanceMeters) < 50);
    if (!dup) unique.push(r);
  }
  return unique;
}




