import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Facility, FacilityType, Itinerary, TravelMode } from '../types';
import { haversineKm } from '../services/Geo';
import { classifyFacilityCategory } from '../services/facilityCategories';


export const API_BASE_URL = 'http://192.168.1.217:5000';
export const WS_BASE_URL = API_BASE_URL; 

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });


api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});


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

export interface RegionCount {
  region: string;
  count: number;
  latitude: number;
  longitude: number;
}

let facilitiesCache: Facility[] | null = null;
let facilitiesCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function classifyType(props: BackendFacilityProperties): FacilityType {
  const a = props.amenity;
  const h = props.healthcare;
  if (a === 'hospital' || h === 'hospital') return 'hospital';
  if (a === 'pharmacy' || h === 'pharmacy') return 'pharmacy';
  if (a === 'clinic' || h === 'clinic') return 'clinic';
  if (a === 'health_post' || h === 'community_health_worker' || h === 'nurse') return 'health_post';
  if (a === 'doctors' || h === 'doctor') return 'csb'; // cabinets de médecin → assimilés CSB
  return 'other';
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
    category: classifyFacilityCategory(props),

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


 
export async function getFacilityCountByRegion(): Promise<{ region: string; count: number }[]> {
  const all = await fetchAllFacilities();
  const map = new Map<string, number>();
  for (const f of all) {
    const key = f.region || 'Inconnue';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);
}
export async function getCachedFacilities(): Promise<Facility[]> {
  return fetchAllFacilities();
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

  // 1) Tous les établissements triés du plus proche au plus lointain.
  const withDist = all
    .map((f) => ({ f, distKm: haversineKm(lat, lon, f.latitude, f.longitude) }))
    .sort((a, b) => a.distKm - b.distKm);

  // 2) Garantit au moins un hôpital, un CSB, une pharmacie et une clinique
  //    (les plus proches de chaque famille), avant de compléter par distance.
  const picked: Facility[] = [];
  const pickedIds = new Set<string>();
  const bucketOf = (c?: string): string | null => {
    if (c === 'chu' || c === 'hospital') return 'hospital';
    if (c === 'csb1' || c === 'csb2') return 'csb';
    if (c === 'pharmacy') return 'pharmacy';
    if (c === 'clinic') return 'clinic';
    return null;
  };
  (['hospital', 'csb', 'pharmacy', 'clinic'] as const).forEach((bucket) => {
    const match = withDist.find(({ f }) => bucketOf(f.category) === bucket && !pickedIds.has(f.id));
    if (match) {
      picked.push(match.f);
      pickedIds.add(match.f.id);
    }
  });

  // 3) Complète avec les plus proches restants jusqu'à `limit`.
  for (const { f } of withDist) {
    if (picked.length >= limit) break;
    if (!pickedIds.has(f.id)) {
      picked.push(f);
      pickedIds.add(f.id);
    }
  }

  // 4) Ajoute la distance pour l'affichage.
  return picked.map((f) => {
    const d = withDist.find(({ f: ff }) => ff.id === f.id)?.distKm ?? 0;
    return { ...f, distanceKm: Math.round(d * 10) / 10 };
  });
}


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

  
  const shortestIdx = mapped.reduce(
    (best: number, r: Itinerary, i: number) => (r.distanceMeters < mapped[best].distanceMeters ? i : best),
    0,
  );
  mapped.forEach((r: Itinerary, i: number) => {
    r.label = i === 0 ? 'recommended' : i === shortestIdx ? 'shortest' : `alt-${i}`;
  });
  if (shortestIdx === 0) mapped[0].label = 'recommended';

 
  const unique: Itinerary[] = [];
  for (const r of mapped) {
    const dup = unique.find((u) => Math.abs(u.distanceMeters - r.distanceMeters) < 50);
    if (!dup) unique.push(r);
  }
  return unique;
}




